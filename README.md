# 📅 Capta Holidays

**Capta Holidays** es una API desarrollada con TypeScript sobre Bun que permite calcular días hábiles, considerando la jornada laboral, recesos, fines de semana y feriados.

---

## 🚀 Tecnologías utilizadas

Este proyecto está construido con las siguientes tecnologías:

- [**Bun**](https://bun.sh/): Runtime moderno y ultrarrápido para JavaScript/TypeScript.
- [**Hono**](https://hono.dev/): Framework web ligero para construir APIs.
- [**Zod**](https://github.com/colinhacks/zod): Validación de esquemas para TypeScript.
- [**TypeScript**](https://www.typescriptlang.org/): Superset de JavaScript con tipado estático.

---

## ☁️ Infraestructura

El proyecto utiliza una arquitectura sin servidor basada en los siguientes servicios:

- [**AWS Lambda**](https://docs.aws.amazon.com/lambda/latest/dg/welcome.html): Ejecución de código bajo demanda sin necesidad de administrar servidores.
- [**Amazon API Gateway**](https://docs.aws.amazon.com/apigateway/latest/developerguide/welcome.html): Creación, publicación y gestión de APIs.
- [**AWS CDK (Cloud Development Kit)**](https://docs.aws.amazon.com/cdk/v2/guide/home.html): Infraestructura como código en TypeScript.

---

## ⚙️ Instrucciones de instalación

### 📌 Requisitos previos

Asegúrate de tener instalado:

- [**Bun**](https://bun.sh/)

### 🧪 Pasos para correr el proyecto localmente

```bash
# Clona el repositorio
git clone https://github.com/tuusuario/capta.git

# Ingresa al directorio del proyecto
cd capta

# Instala dependencias
bun install

# Copia el archivo de entorno
cp .env.example .env

# Inicia el servidor de desarrollo
bun run dev
```

La API estará disponible en `http://localhost:3000` o en el puerto especificado.

---

## 🚀 Despliegue en AWS

El subproyecto `aws/` contiene la infraestructura para desplegar Capta como una Lambda usando AWS CDK.

### 📌 Requisitos

- [**Node.js ≥ 18.x**](https://nodejs.org/)
- [**AWS CLI**](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html) configurado
- [**AWS CDK**](https://docs.aws.amazon.com/cdk/v2/guide/home.html) instalado globalmente:

```bash
npm install -g aws-cdk
```

### 🌐 Despliegue en la nube

```bash
# 1. Configura tus credenciales de AWS (solo la primera vez)
aws configure

# 2. Prepara la cuenta con CDK (solo la primera vez por cuenta/region)
cdk bootstrap

# 3. Build del proyecto de Hono
bun run lambda:build 

# 4. Ingresa al subproyecto de infraestructura
cd aws

# 5. Instala dependencias de infraestructura
npm install

# 6. Despliega con CDK 🚀
cdk deploy
```

---

## 🧪 Pruebas locales con Docker y SAM

Para probar localmente la función Lambda, es necesario tener [**Docker**](https://www.docker.com/) instalado.

```bash
# Ingresa al subproyecto
cd aws

# Instala dependencias
npm install

# Construye el proyecto
npm run build

# Ejecuta una prueba local de la Lambda usando AWS SAM
sam local invoke HonoFn -e event.json
```

> ℹ️ Requiere tener instalado [**AWS SAM CLI**](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html) globalmente

---

## 📂 Estructura del proyecto

```plaintext
capta/
├── src/              # Código fuente principal
├── aws/              # Infraestructura con AWS CDK
├── .env.example      # Variables de entorno de ejemplo
├── package.json      # Configuración de dependencias y scripts
├── tsconfig.json     # Configuración de TypeScript
└── README.md         # Documentación del proyecto
```