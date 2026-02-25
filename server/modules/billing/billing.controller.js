import Stripe from 'stripe';
import { config } from '../../shared/config/index.js';
import { supabaseAdmin } from '../../shared/lib/supabase.js';
import logger from '../../shared/lib/logger.js';

const stripe = new Stripe(config.stripe.secretKey);

const PLAN_PRICES = {
    'basic': 1999, // $19.99
    'advanced': 4999,     // $49.99
    'elite': 6999    // $69.99
};

const PLAN_NAMES = {
    'basic': 'Basic Plan',
    'advanced': 'Advanced Plan',
    'elite': 'Elite Plan'
};

const getPlanModules = (planId) => {
    const modules = new Set();
    const plan = planId?.toLowerCase();

    if (plan === 'basic') {
        modules.add('rbt_generator');
    } else if (plan === 'advanced') {
        modules.add('rbt_generator');
        modules.add('bcba_generator');
    } else if (plan === 'elite') {
        modules.add('rbt_generator');
        modules.add('bcba_generator');
        modules.add('note_generator');
    }
    return Array.from(modules);
};

export const createCheckoutSession = async (req, res) => {
    try {
        const { planId, interval: clientInterval = 'month' } = req.body;
        const user = req.user;

        const intervalMap = {
            'monthly': 'month',
            'month': 'month',
            'annual': 'year',
            'year': 'year'
        };

        const interval = intervalMap[clientInterval] || 'month';

        if (!PLAN_PRICES[planId]) {
            return res.status(400).json({ error: 'Invalid plan ID' });
        }

        let unitAmount = PLAN_PRICES[planId];

        if (interval === 'year') {
            unitAmount = Math.round(unitAmount * 12 * 0.8);
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            customer_email: user.email,
            client_reference_id: user.id,
            metadata: {
                planId,
                userId: user.id
            },
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: PLAN_NAMES[planId],
                            description: `NexusPro ${PLAN_NAMES[planId]} (${interval})`,
                        },
                        unit_amount: unitAmount,
                        recurring: {
                            interval: interval,
                        },
                    },
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${req.headers.origin}/#/?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${req.headers.origin}/#/plans`,
        });

        logger.info(`[Stripe] Checkout session created`, { planId, interval, userId: user.id, sessionId: session.id });
        res.json({ url: session.url });
    } catch (error) {
        logger.error('[Stripe] Checkout Error', { error: error.message, userId: req.user?.id });
        res.status(500).json({ error: error.message });
    }
};


export const handleWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
    } catch (err) {
        logger.warn(`[Stripe Webhook] Error verifying signature`, { error: err.message });
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    switch (event.type) {
        case 'checkout.session.completed': {
            const session = event.data.object;
            const userId = session.client_reference_id;
            const planId = session.metadata?.planId;
            const customerId = session.customer;
            const subscriptionId = session.subscription;

            logger.info(`[Stripe Webhook] Payment success`, { userId, planId, customerId });

            if (userId && planId) {
                if (supabaseAdmin) {
                    const modules = getPlanModules(planId);
                    const { error } = await supabaseAdmin
                        .from('profiles')
                        .update({
                            plan: planId,
                            subscription_status: 'active',
                            access: modules,
                            stripe_customer_id: customerId,
                            stripe_subscription_id: subscriptionId,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', userId);

                    if (error) {
                        logger.error('[Stripe Webhook] Failed to update profile', { error: error.message, userId });
                    } else {
                        logger.info('[Stripe Webhook] Profile updated successfully', { userId });
                    }
                }
            }
            break;
        }

        case 'invoice.payment_succeeded': {
            const invoice = event.data.object;
            logger.info(`[Stripe Webhook] Invoice payment succeeded`, { email: invoice.customer_email, amount: invoice.amount_paid });
            break;
        }

        case 'customer.subscription.deleted': {
            const subscription = event.data.object;
            const customerId = subscription.customer;
            logger.info(`[Stripe Webhook] Subscription deleted`, { customerId });

            if (supabaseAdmin) {
                let { data: user, error } = await supabaseAdmin
                    .from('profiles')
                    .select('id, email')
                    .eq('stripe_customer_id', customerId)
                    .single();

                if (!user) {
                    try {
                        const customer = await stripe.customers.retrieve(customerId);
                        if (customer.email && !customer.deleted) {
                            const { data: userByEmail } = await supabaseAdmin
                                .from('profiles')
                                .select('id, email')
                                .eq('email', customer.email)
                                .single();
                            user = userByEmail;
                        }
                    } catch (stripeError) {
                        logger.error('[Stripe Webhook] Error fetching Stripe customer', { customerId, error: stripeError.message });
                    }
                }

                if (user) {
                    logger.info(`[Stripe Webhook] Revoking access`, { email: user.email, userId: user.id });
                    await supabaseAdmin
                        .from('profiles')
                        .update({
                            plan: 'no_plan',
                            subscription_status: 'canceled',
                            access: [],
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', user.id);
                } else {
                    logger.warn(`[Stripe Webhook] User not found for deleted sub`, { customerId });
                }
            }
            break;
        }

        default:
            logger.debug(`[Stripe Webhook] Unhandled event type received`, { eventType: event.type });
    }

    res.json({ received: true });
};

export const cancelSubscription = async (req, res) => {
    try {
        const user = req.user;
        const email = user.email;

        logger.info(`[Stripe] Cancel subscription requested`, { userId: user.id, email });

        const customers = await stripe.customers.list({ email: email, limit: 1 });
        if (customers.data.length === 0) {
            logger.warn('[Stripe] Cancel failed: no Stripe customer found', { email, userId: user.id });
            return res.status(404).json({ error: 'No Stripe customer found' });
        }
        const customer = customers.data[0];

        const subscriptions = await stripe.subscriptions.list({
            customer: customer.id,
            status: 'active',
            limit: 1
        });

        if (subscriptions.data.length === 0) {
            logger.warn('[Stripe] Cancel failed: no active subscription found', { email, userId: user.id });
            return res.status(404).json({ error: 'No active subscription found' });
        }

        const subscription = subscriptions.data[0];

        const updatedSubscription = await stripe.subscriptions.update(subscription.id, {
            cancel_at_period_end: true
        });

        logger.info(`[Stripe] Subscription set to cancel at period end`, { subscriptionId: subscription.id, userId: user.id });

        res.json({
            message: 'Subscription will be canceled at the end of the billing period',
            cancel_at: updatedSubscription.cancel_at
        });

    } catch (error) {
        logger.error('[Stripe] Cancel Subscription Error', { error: error.message, userId: req.user?.id });
        res.status(500).json({ error: error.message });
    }
};


export const verifySession = async (req, res) => {
    const { sessionId } = req.body;
    const user = req.user;

    if (!sessionId) {
        return res.status(400).json({ error: 'Session ID is required' });
    }

    try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (session.client_reference_id !== user.id) {
            return res.status(403).json({ error: 'Unauthorized: Session does not belong to user' });
        }

        if (session.payment_status === 'paid') {
            const planId = session.metadata?.planId;
            logger.info('[Stripe] Session verified as paid', { sessionId, planId, userId: user.id });

            if (supabaseAdmin && planId) {
                const modules = getPlanModules(planId);
                const { error } = await supabaseAdmin
                    .from('profiles')
                    .update({
                        plan: planId,
                        subscription_status: 'active',
                        access: modules,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', user.id);

                if (error) {
                    logger.error('[Stripe] verifySession - Failed to update profile', { error: error.message, userId: user.id });
                    throw error;
                }
                logger.info('[Stripe] Profile updated via verifySession', { planId, userId: user.id });
            }

            return res.json({ success: true, plan: planId });
        } else {
            logger.warn('[Stripe] verifySession - Payment not completed', { sessionId, status: session.payment_status, userId: user.id });
            return res.status(400).json({ error: 'Payment not completed or pending' });
        }
    } catch (error) {
        logger.error('[Stripe] Verify Session Error', { error: error.message, userId: req.user?.id });
        res.status(500).json({ error: error.message });
    }
};


export const getSubscriptionDetails = async (req, res) => {
    try {
        const user = req.user;
        const email = user.email;

        const customers = await stripe.customers.list({ email: email, limit: 1 });
        if (customers.data.length === 0) {
            return res.json({ subscription: null });
        }
        const customer = customers.data[0];

        const subscriptions = await stripe.subscriptions.list({
            customer: customer.id,
            status: 'active',
            limit: 1
        });

        if (subscriptions.data.length === 0) {
            logger.info('[Stripe] getSubscriptionDetails - No active subscription', { userId: user.id });
            return res.json({ subscription: null });
        }

        const subscription = subscriptions.data[0];
        logger.debug('[Stripe] Subscription details retrieved', { subscriptionId: subscription.id, userId: user.id });

        res.json({
            subscription: {
                id: subscription.id,
                current_period_end: subscription.current_period_end,
                cancel_at: subscription.cancel_at,
                cancel_at_period_end: subscription.cancel_at_period_end,
                status: subscription.status
            }
        });

    } catch (error) {
        logger.error('[Stripe] Get Subscription Details Error', { error: error.message, userId: req.user?.id });
        res.status(500).json({ error: error.message });
    }
};


export const resumeSubscription = async (req, res) => {
    try {
        const user = req.user;
        const email = user.email;

        const customers = await stripe.customers.list({ email: email, limit: 1 });
        if (customers.data.length === 0) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        const customer = customers.data[0];

        const subscriptions = await stripe.subscriptions.list({
            customer: customer.id,
            status: 'active',
            limit: 1
        });

        if (subscriptions.data.length === 0) {
            return res.status(404).json({ error: 'No active subscription found' });
        }

        const subscription = subscriptions.data[0];

        const updatedSubscription = await stripe.subscriptions.update(subscription.id, {
            cancel_at_period_end: false
        });

        logger.info('[Stripe] Subscription resumed', { subscriptionId: subscription.id, userId: user.id });
        res.json({ status: 'resumed', subscription: updatedSubscription });

    } catch (error) {
        logger.error('[Stripe] Resume Subscription Error', { error: error.message, userId: req.user?.id });
        res.status(500).json({ error: error.message });
    }
};


export const createPortalSession = async (req, res) => {
    try {
        const user = req.user;
        const email = user.email;

        const customers = await stripe.customers.list({ email: email, limit: 1 });
        if (customers.data.length === 0) {
            return res.status(404).json({ error: 'No Stripe customer found' });
        }
        const customer = customers.data[0];

        const session = await stripe.billingPortal.sessions.create({
            customer: customer.id,
            return_url: `${req.headers.origin}/#/plans`,
        });

        logger.info('[Stripe] Customer Portal session created', { customerId: customer.id, userId: user.id });
        res.json({ url: session.url });
    } catch (error) {
        logger.error('[Stripe] Create Portal Session Error', { error: error.message, userId: req.user?.id });
        res.status(500).json({ error: error.message });
    }
};


export const updateSubscription = async (req, res) => {
    try {
        const user = req.user;
        const { planId } = req.body;

        if (!PLAN_PRICES[planId]) {
            return res.status(400).json({ error: 'Invalid plan ID' });
        }

        const customers = await stripe.customers.list({ email: user.email, limit: 1 });
        if (customers.data.length === 0) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        const customer = customers.data[0];

        const subscriptions = await stripe.subscriptions.list({
            customer: customer.id,
            status: 'active',
            limit: 1
        });

        if (subscriptions.data.length === 0) {
            return res.status(404).json({ error: 'No active subscription found to update' });
        }
        const subscription = subscriptions.data[0];
        const subscriptionItemId = subscription.items.data[0].id;

        const price = await stripe.prices.create({
            unit_amount: PLAN_PRICES[planId],
            currency: 'usd',
            recurring: { interval: 'month' },
            product_data: {
                name: PLAN_NAMES[planId]
            }
        });

        const updatedSubscription = await stripe.subscriptions.update(subscription.id, {
            items: [{
                id: subscriptionItemId,
                price: price.id,
            }],
            proration_behavior: 'always_invoice',
            expand: ['latest_invoice.payment_intent'],
            metadata: {
                planId: planId
            }
        });

        const invoice = updatedSubscription.latest_invoice;
        let invoiceUrl = null;

        if (invoice && invoice.amount_due > 0 && invoice.status === 'open') {
            invoiceUrl = invoice.hosted_invoice_url;
        }

        if (supabaseAdmin) {
            const modules = getPlanModules(planId);
            await supabaseAdmin
                .from('profiles')
                .update({
                    plan: planId,
                    access: modules,
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id);
        }

        logger.info(`[Stripe] Subscription updated`, { subscriptionId: subscription.id, planId, userId: user.id });
        res.json({
            success: true,
            planId,
            invoiceUrl: invoiceUrl,
            subscription: updatedSubscription
        });

    } catch (error) {
        logger.error('[Stripe] Operation failed', { error: error.message, userId: req.user?.id });
        res.status(500).json({ error: error.message });
    }
};
