# Firma permanente de C&C Gestión Prueba

La aplicación Android de prueba conserva siempre el mismo identificador:

```text
com.cycgestion.prueba
```

Las variantes `debug` y `release` se firman con la misma keystore permanente. Si faltan las credenciales, Gradle detiene la compilación para impedir que se genere por error un APK firmado con una `debug.keystore` distinta.

## Identidad actual

```text
Alias: cycgestionprueba
Certificado SHA-256: 8912004da9b04a25c23987d3e91cd213680d30d2f632943308bafd1a7837b772
```

El certificado es público; las contraseñas y la clave privada no se incluyen en este archivo ni en Git.

## Material que se debe resguardar

En la computadora de firma, el material local está fuera del repositorio:

```text
%USERPROFILE%\.cyc-gestion-signing\cyc-gestion-prueba.jks
%USERPROFILE%\.cyc-gestion-signing\signing.properties
```

La keystore tiene una copia de respaldo en la ubicación privada indicada al momento de crearla. Guardá además la keystore y el contenido de `signing.properties` en un gestor de contraseñas o almacenamiento cifrado. No subirlos a Git, enviarlos por chat ni adjuntarlos a issues.

`signing.properties` contiene estas cuatro claves:

```text
CYC_ANDROID_KEYSTORE_PATH
CYC_ANDROID_STORE_PASSWORD
CYC_ANDROID_KEY_ALIAS
CYC_ANDROID_KEY_PASSWORD
```

## GitHub Actions

El workflow requiere estos cuatro Secrets del repositorio:

```text
ANDROID_KEYSTORE_BASE64
ANDROID_STORE_PASSWORD
ANDROID_KEY_ALIAS
ANDROID_KEY_PASSWORD
```

`ANDROID_KEYSTORE_BASE64` debe ser el contenido Base64 de la keystore, sin modificar. En PowerShell, desde una computadora que posea la copia segura:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes('C:\ruta\cyc-gestion-prueba.jks'))
```

Los otros tres secretos deben coincidir con `CYC_ANDROID_STORE_PASSWORD`, `CYC_ANDROID_KEY_ALIAS` y `CYC_ANDROID_KEY_PASSWORD` de `signing.properties`.

El workflow reconstruye la keystore sólo en `$RUNNER_TEMP`, firma `app-debug.apk`, verifica la huella SHA-256 y elimina el archivo temporal aun si la compilación falla.

## Restauración en otra computadora

1. Copiá la keystore desde el respaldo seguro a `%USERPROFILE%\.cyc-gestion-signing\cyc-gestion-prueba.jks`.
2. Recreá `%USERPROFILE%\.cyc-gestion-signing\signing.properties` con las cuatro claves locales anteriores, ajustando únicamente la ruta si fuera necesario. En `CYC_ANDROID_KEYSTORE_PATH` usá barras normales, por ejemplo `C:/Users/usuario/.cyc-gestion-signing/cyc-gestion-prueba.jks`.
3. Verificá la identidad antes de compilar:

   ```powershell
   keytool -list -v -keystore %USERPROFILE%\.cyc-gestion-signing\cyc-gestion-prueba.jks -alias cycgestionprueba
   ```

4. Confirmá que el SHA-256 sea el valor documentado arriba.
5. Configurá los mismos cuatro GitHub Secrets si se trabaja en otro repositorio.

Sin esta keystore no es posible publicar una actualización que conserve los datos de `com.cycgestion.prueba`.

## Versiones

No cambiar `applicationId`. Cada APK que deba instalarse sobre uno anterior debe tener un `versionCode` estrictamente mayor. `versionName` es el identificador legible para las personas.

Antes de distribuir un APK, verificar:

```powershell
apksigner verify --verbose --print-certs android/app/build/outputs/apk/debug/app-debug.apk
```

La huella debe coincidir con la identidad actual.
