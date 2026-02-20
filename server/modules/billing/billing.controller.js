import Stripe from 'stripe';
import { config } from '../../shared/config/index.js';
import { createClient } from '@supabase/supabase-js';

const getAdminClient = () => {
    const serviceRoleKey = config.supabase.serviceRoleKey;
    const supabaseUrl = config.supabase.url;

    if (!supabaseUrl || !serviceRoleKey) {
        console.error('[Stripe Webhook] Missing Config: VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
        return null;
    }

    return createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });
};

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

        res.json({ url: session.url });
    } catch (error) {
        console.error('Stripe Checkout Error:', error);
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
        console.error(`[Stripe Webhook] Error verifying signature: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    switch (event.type) {
        case 'checkout.session.completed': {
            const session = event.data.object;
            const userId = session.client_reference_id;
            const planId = session.metadata?.planId;
            const customerId = session.customer;
            const subscriptionId = session.subscription;

            console.log(`[Stripe Webhook] Payment success for User ${userId}, Plan: ${planId}`);

            if (userId && planId) {
                const supabaseAdmin = getAdminClient();
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
                        console.error('[Stripe Webhook] Failed to update profile:', error);
                    } else {
                        console.log('[Stripe Webhook] Profile updated successfully');
                    }
                }
            }
            break;
        }

        case 'invoice.payment_succeeded': {
            const invoice = event.data.object;
            console.log(`[Stripe Webhook] Invoice payment succeeded for ${invoice.customer_email}`);
            break;
        }

        case 'customer.subscription.deleted': {
            const subscription = event.data.object;
            const customerId = subscription.customer;
            console.log(`[Stripe Webhook] Subscription deleted for customer ${customerId}`);

            const supabaseAdmin = getAdminClient();
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
                        console.error('Error fetching stripe customer:', stripeError);
                    }
                }

                if (user) {
                    console.log(`[Stripe Webhook] Revoking access for user ${user.email}`);
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
                    console.warn(`[Stripe Webhook] Could not find user for deleted subscription (Customer: ${customerId})`);
                }
            }
            break;
        }

        default:
            console.log(`[Stripe Webhook] Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
};

export const cancelSubscription = async (req, res) => {
    try {
        const user = req.user;
        const email = user.email;

        console.log(`[Stripe] Attempting to cancel subscription for ${email}`);

        const customers = await stripe.customers.list({ email: email, limit: 1 });
        if (customers.data.length === 0) {
            return res.status(404).json({ error: 'No Stripe customer found' });
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
            cancel_at_period_end: true
        });

        console.log(`[Stripe] Subscription ${subscription.id} set to cancel at period end`);

        res.json({
            message: 'Subscription will be canceled at the end of the billing period',
            cancel_at: updatedSubscription.cancel_at
        });

    } catch (error) {
        console.error('Cancel Subscription Error:', error);
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

            const supabaseAdmin = getAdminClient();
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

                if (error) throw error;
            }

            return res.json({ success: true, plan: planId });
        } else {
            return res.status(400).json({ error: 'Payment not completed or pending' });
        }
    } catch (error) {
        console.error('Verify Session Error:', error);
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
            return res.json({ subscription: null });
        }

        const subscription = subscriptions.data[0];

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
        console.error('Get Subscription Details Error:', error);
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

        res.json({ status: 'resumed', subscription: updatedSubscription });

    } catch (error) {
        console.error('Resume Subscription Error:', error);
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

        res.json({ url: session.url });
    } catch (error) {
        console.error('Create Portal Session Error:', error);
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

        const supabaseAdmin = getAdminClient();
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

        console.log(`[Stripe] Subscription ${subscription.id} updated to ${planId}`);
        res.json({
            success: true,
            planId,
            invoiceUrl: invoiceUrl,
            subscription: updatedSubscription
        });

    } catch (error) {
        console.error('Update Subscription Error:', error);
        res.status(500).json({ error: error.message });
    }
};
