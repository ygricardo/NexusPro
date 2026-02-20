import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'en' | 'es';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const translations: Record<string, Record<Language, string>> = {
    // Sidebar
    'dashboard': { en: 'Dashboard', es: 'Tablero' },
    'noteGenerator': { en: 'Note Generator', es: 'Generador de Notas' },
    'bcbaGenerator': { en: 'Weekly Data', es: 'Datos Semanales' },
    'rbtGenerator': { en: 'Daily Data', es: 'Datos Diarios' },
    'adminUsers': { en: 'Admin Users', es: 'Usuarios Admin' },
    'membership': { en: 'Membership', es: 'Membresía' },
    'licenses': { en: 'Licenses', es: 'Licencias' },
    'plans': { en: 'Plans', es: 'Planes' },
    'logout': { en: 'Log Out', es: 'Cerrar Sesión' },
    'active': { en: 'Active', es: 'Activo' },
    'clients': { en: 'Clients', es: 'Clientes' },
    'tasks': { en: 'Tasks', es: 'Tareas' },
    'users': { en: 'Users', es: 'Usuarios' },
    'noteHistory': { en: 'Note History', es: 'Historial de Notas' },
    'noteHistoryDesc': { en: 'Browse and manage your generated clinical session notes.', es: 'Navega y gestiona tus notas clínicas generadas.' },
    'aiNoteGenerator': { en: 'AI Note Generator', es: 'IA Generador de Notas' },

    // Dashboard
    'greeting': { en: 'Good Afternoon, Alex', es: 'Buenas tardes, Alex' },
    'sessions_msg': { en: 'You have 2 sessions scheduled today.', es: 'Tienes 2 sesiones programadas hoy.' },
    'privacy_mode': { en: 'Privacy Mode', es: 'Modo Privacidad' },
    'start_session': { en: 'Start Scheduled Session', es: 'Iniciar Sesión' },
    'active_clients': { en: 'Active Clients', es: 'Clientes Activos' },
    'view_all': { en: 'View All', es: 'Ver Todos' },
    'session_in': { en: 'Session in 30 mins', es: 'Sesión en 30 min' },
    'progress': { en: 'Progress', es: 'Progreso' },
    'open_binder': { en: 'Open Binder', es: 'Abrir Carpeta' },
    'no_sessions': { en: 'No sessions today', es: 'Sin sesiones hoy' },
    'view_history': { en: 'View History', es: 'Ver Historial' },
    'new_client': { en: 'New Client', es: 'Nuevo Cliente' },
    'assign_student': { en: 'Assign a new student', es: 'Asignar nuevo estudiante' },
    'pending_tasks': { en: 'Pending Tasks', es: 'Tareas Pendientes' },
    'session_draft': { en: 'Session Note Draft', es: 'Borrador de Nota' },
    'incomplete': { en: 'Incomplete', es: 'Incompleto' },
    'monthly_report': { en: 'Monthly Progress Report', es: 'Reporte Mensual' },
    'due_days': { en: 'Due in 2 days', es: 'Vence en 2 días' },
    'review': { en: 'Review', es: 'Revisar' },
    'quick_collect': { en: 'Quick Collect', es: 'Recolección Rápida' },
    'widget_active': { en: 'Widget Active', es: 'Widget Activo' },
    'session_timer': { en: 'Session Timer', es: 'Temporizador' },

    // Generators
    'gen_results': { en: 'Generated Results', es: 'Resultados Generados' },
    'copy_table': { en: 'Copy Table', es: 'Copiar Tabla' },
    'copy_text': { en: 'Copy Text', es: 'Copiar Texto' },
    'copied': { en: 'Copied!', es: '¡Copiado!' },
    'behavior_name': { en: 'Behavior Name', es: 'Nombre Conducta' },
    'total_count': { en: 'Total Count', es: 'Conteo Total' },
    'days': { en: 'Days', es: 'Días' },
    'add_behavior': { en: 'Add Behavior', es: 'Agregar Conducta' },
    'generate_data': { en: 'Generate Data', es: 'Generar Datos' },
    'day': { en: 'Day', es: 'Día' },
    'total': { en: 'Total', es: 'Total' },
    'start_week': { en: 'Start Week', es: 'Semana Inicio' },
    'end_week': { en: 'End Week', es: 'Semana Fin' },
    'start_value': { en: 'Start Value', es: 'Valor Inicio' },
    'end_value': { en: 'End Value', es: 'Valor Fin' },
    'process': { en: 'Process', es: 'Procesar' },
    'export_xlsx': { en: 'Export XLSX', es: 'Exportar XLSX' },
    'print': { en: 'Print', es: 'Imprimir' },
    'maladaptives': { en: 'MALADAPTIVES (Decrease)', es: 'MALADAPTATIVAS (Reducir)' },
    'replacements': { en: 'REPLACEMENTS (Increase)', es: 'REEMPLAZO (Aumentar)' },
    'total_weeks': { en: 'Total Weeks to Graph:', es: 'Semanas Totales:' },
    'gen_description': { en: 'Generates natural numbers complying with clinical reporting rules:', es: 'Genera números naturales cumpliendo reglas de reporte clínico:' },
    'clinical_suite': { en: 'Weekly Clinical Suite Pro', es: 'Suite Clínica Semanal Pro' },
    'rbt_suite': { en: 'Daily Number Generator', es: 'Generador Números Diarios' },

    // Session Note
    'generate_note': { en: 'Generate Note', es: 'Generar Nota' },
    'upload_pdf': { en: 'Upload PDF', es: 'Subir PDF' },
    'remove_file': { en: 'Eliminar archivo', es: 'Remove file' },
    'error_no_file': { en: 'Please upload a PDF file to generate the note.', es: 'Por favor sube un archivo PDF para generar la nota.' },
    'no_file_selected': { en: 'No file selected', es: 'Ningún archivo seleccionado' },
    'quantitative_data': { en: 'Quantitative Data', es: 'Datos Cuantitativos' },
    'narrative_draft': { en: 'Narrative Draft', es: 'Borrador Narrativo' },
    'save_draft': { en: 'Save Draft', es: 'Guardar Borrador' },
    'sign_submit': { en: 'Sign & Submit', es: 'Firmar y Enviar' },
    'number_of_notes': { en: 'Number of Notes', es: 'Número de Notas' },

    // Admin Users
    'user_management': { en: 'User Management', es: 'Gestión de Usuarios' },
    'user_management_desc': { en: 'Manage user access and module permissions. Restricted to Administrators.', es: 'Administre el acceso de usuarios y permisos de módulos. Restringido a Administradores.' },
    'manage_permissions': { en: 'Edit User & Permissions', es: 'Editar Usuario y Permisos' },
    'module_access': { en: 'Module Access', es: 'Acceso a Módulos' },
    'role': { en: 'Role', es: 'Rol' },
    'status': { en: 'Status', es: 'Estado' },
    'save_changes': { en: 'Save Changes', es: 'Guardar Cambios' },
    'cancel': { en: 'Cancel', es: 'Cancelar' },
    'admin_only': { en: 'Admin Access Only', es: 'Solo Acceso Admin' },
    'modules': { en: 'Modules', es: 'Módulos' },
    'search_placeholder': { en: 'Search by name or email...', es: 'Buscar por nombre o correo...' },
    'add_user': { en: 'Add User', es: 'Agregar Usuario' },
    'delete_confirm': { en: 'Are you sure you want to delete this user?', es: '¿Estás seguro de que deseas eliminar este usuario?' },
    'create_user': { en: 'Create User', es: 'Crear Usuario' },
    'name_label': { en: 'Full Name', es: 'Nombre Completo' },
    'email_label': { en: 'Email Address', es: 'Correo Electrónico' },
    'role_label': { en: 'User Role', es: 'Rol de Usuario' },
    'status_label': { en: 'Account Status', es: 'Estado de Cuenta' },
    'user_details': { en: 'User Details', es: 'Detalles del Usuario' },
    'membership_plan': { en: 'Membership Plan', es: 'Plan de Membresía' },
    'grant_plan': { en: 'Grant Plan Access', es: 'Otorgar Acceso a Plan' },
    'plan_label': { en: 'Active Plan', es: 'Plan Activo' },

    // Plans Page
    'plans_title': { en: 'Plans for Professionals', es: 'Planes para Profesionales' },
    'plans_desc': { en: 'Secure, HIPAA-compliant tools designed to save time on clinical documentation.', es: 'Herramientas seguras y compatibles con HIPAA diseñadas para ahorrar tiempo en documentación clínica.' },
    'monthly': { en: 'Monthly', es: 'Mensual' },
    'annual': { en: 'Annual', es: 'Anual' },
    'save_20': { en: 'Save 20%', es: 'Ahorra 20%' },
    'select_plan': { en: 'Select Plan', es: 'Seleccionar Plan' },
    'current_plan_badge': { en: 'Current Plan', es: 'Plan Actual' },
    'cancel_membership': { en: 'Cancel Membership', es: 'Cancelar Membresía' },
    'most_popular': { en: 'Most Popular', es: 'Más Popular' },
    'per_month': { en: '/mo', es: '/mes' },
    'billed_annually': { en: 'billed annually', es: 'facturado anualmente' },
    'free': { en: 'Free', es: 'Gratis' },

    // Plan Names & Descriptions
    'plan_rbt_pro': { en: 'RBT Pro', es: 'RBT Pro' },
    'desc_rbt_pro': { en: 'Advanced features for RBTs managing multiple clients.', es: 'Funciones avanzadas para RBTs que gestionan múltiples clientes.' },
    'plan_analyst_pro': { en: 'BCBA', es: 'BCBA' },
    'desc_analyst_pro': { en: 'Complete clinical suite for BCBA supervision.', es: 'Suite clínica completa para supervisión de BCBA.' },

    // Features
    'feat_gen_limited': { en: 'Daily Generator (Max 3 Clients)', es: 'Generador Diario (Máx. 3 clientes)' },
    'feat_gen_unlimited': { en: 'Unlimited Daily Generator', es: 'Generador Diario Ilimitado' },
    'feat_ai_notes_adv': { en: 'AI Note Generator (Assignment Based)', es: 'Notas con IA (Basado en Asignación)' },
    'feat_hipaa_secure': { en: 'Secure & HIPAA Compliant', es: 'Seguro y Compatible con HIPAA' },
    'feat_manual_log': { en: 'Manual Session Logging', es: 'Registro Manual de Sesiones' },
    'feat_time_saving': { en: 'Time-Saving Automation', es: 'Automatización Ahorra-Tiempo' },
    'feat_bcba_exclusive': { en: 'Weekly Number Generator Access', es: 'Acceso a Generador de Números Semanales' },
    'feat_supervision': { en: 'Supervision Tools (CPT 97155)', es: 'Herramientas de Supervisión (CPT 97155)' },
    'feat_priority_support': { en: 'Priority Email Support', es: 'Soporte por Correo Prioritario' },

    // Liability & Legal
    'ai_draft_title': { en: 'AI-Assisted Draft:', es: 'Borrador Asistido por IA:' },
    'ai_draft_body': { en: 'Artificial intelligence can make mistakes. It is the responsibility of the clinician to review, edit, and verify the accuracy of this note before signing.', es: 'La inteligencia artificial puede cometer errores. Es responsabilidad del clínico revisar, editar y verificar la precisión de esta nota antes de firmar.' },
    'liability_cert': { en: 'I certify that I have reviewed the generated content for clinical accuracy and compliance.', es: 'Certifico que he revisado el contenido generado para asegurar su precisión clínica y cumplimiento.' },
    'liability_footer': { en: 'NexusPro AI is a clinical assistant tool, not a substitute for professional judgment.', es: 'NexusPro AI es una herramienta de asistencia clínica, no un sustituto del juicio profesional.' },
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
    const [language, setLanguage] = useState<Language>(() => {
        return (localStorage.getItem('app_language') as Language) || 'en';
    });

    useEffect(() => {
        localStorage.setItem('app_language', language);
    }, [language]);

    const t = (key: string) => {
        return translations[key]?.[language] || key;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};