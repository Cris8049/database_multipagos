## Requisitos

> AWS cli   +2.*
> Node js   +16.* lts
> Docker    +4.0
> Git

## Preconfiguracion
> Porfavor leer sobre la [Instalacion de AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html) y la [Configuracion de AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-quickstart.html)

> Tambien leer sobre la [Configuracion inicial de GIT](https://git-scm.com/book/en/v2/Customizing-Git-Git-Configuration), la [Generacion de la Llave SSH en GitHub](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent) y [Agregar la Llave SSH](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/adding-a-new-ssh-key-to-your-github-account)
> Muy probablemente si se encuentra en windows tenga problemas con la generacion de la llave, por lo que para activar el agente ssh, siga los siguientes pasos
> Cambiamos el tipo de inicio del agente `Set-Service -Name ssh-agent -StartupType Manual`
> Por ultimo iniciamos el servicio con `Start-Service ssh-agent`
> Ahora si puede continuar con la guia oficial de GitHub

## Entorno de Desarrollo
Para poder hacer un despliegue local de desarrollo solo es necesario contar con NodeJs.
Como primer paso se debe crear un archivo de entorno `.env` basandonos en el archivo `.example.env`.
Posterior a esto se deben instalar las dependencias necesarias
- Npm
    > `npm install`
- Yarn
    > `yarn install`

Posteriormente para levantar el servidor local solo hace falta correr el siguiente comando
```sh
npm run start
```

## Etapa de Despliege
En esta etapa es donde haremos uso de Docker, ya que construiremos la imagen siguiendo estos pasos.
> Primero debes estar seguro de tener la sesion de AWS CLI linkeada a Docker, para ello mejor si iniciamos sesion, con el siguiente comando podemos hacer eso:
> `aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 928143157195.dkr.ecr.us-east-1.amazonaws.com`

Lo que hacemos es ubicarnos en la carpeta raiz del proyecto, en donde se encuentran los archivos de `package.json` y la carpeta de `src/`.
Aqui es donde ejecutamos el siguiente comando, el cual creara la imagen Docker en nuestro dispositivo con el tag `wppbot-frontend` en version `latest`, es decir, la ultima
```sh
docker build -t wppbot-api:latest .
```

Luego necesitamos tagearlo con respecto al contenedor remoto con el siguiente comando
```sh
docker tag wppbot-api:latest 928143157195.dkr.ecr.us-east-1.amazonaws.com/wppbot-v1-production:latest
```

Y por ultimo, subimos la imagen tageada a AWS para que el sistema se encarge de continuar el despliegue
```sh
docker push 928143157195.dkr.ecr.us-east-1.amazonaws.com/wppbot-v1-production:latest
```

Ahora, al cabo de un rato la infraestructura hara el pull de la imagen de manera automatica

## TODO
- [ ] Tener un entorno de desarrollo mas aislado con respecto a Produccion
- [ ] Automatizar la etapa de despliegue cuando se integre a la rama `main`# database_celina
