# Protocolo de Auditoría - Code_Auditor

## 1. Seguridad (Critical)
- [ ] **Input Validation**: ¿Se validan todas las entradas externas? (Zod, Joi, etc.)
- [ ] **SQL Injection**: ¿Se usan consultas parametrizadas o ORM seguro? (Nada de concatenación de strings en SQL).
- [ ] **XSS**: ¿Se están renderizando datos de usuario sin escapar en el frontend? (DangerouslySetInnerHTML, etc).
- [ ] **Auth**: ¿Se verifican permisos y roles en cada endpoint protegido?

## 2. Rendimiento (Major)
- [ ] **Loops**: ¿Hay bucles anidados innecesarios o de complejidad O(n^2)?
- [ ] **Database**: ¿Hay consultas N+1? ¿Faltan índices e claves foráneas?
- [ ] **Memory**: ¿Se limpian los listeners o suscripciones? (useEffect return, etc).
- [ ] **Upstream Processing**: ¿Se están haciendo cálculos pesados en el Frontend que deberían ser en el Backend?

## 3. Calidad de Código y TypeScript (Standard)
- [ ] **Types**: ¿Hay uso de `any`? (ESTRICTAMENTE PROHIBIDO). ¿Están las interfaces bien definidas?
- [ ] **DRY (Don't Repeat Yourself)**: ¿Hay lógica duplicada que se pueda abstraer?
- [ ] **Naming**: ¿Las variables y funciones tienen nombres descriptivos en inglés/español consistente?
- [ ] **Error Handling**: ¿Hay bloques try/catch vacíos? ¿Se reportan los errores al manejador global?

## 4. Reglas del Proyecto (User Rules)
- [ ] **Single Source of Truth**: ¿El estado global maneja la data? ¿O hay estados locales redundantes?
- [ ] **Desacoplamiento UI/Lógica**: ¿La UI contiene lógica de negocio compleja? (Debe ser movida a hooks/servicios/backend).
