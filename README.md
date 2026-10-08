# FORJA · Gym Tracker

Una app minimalista para registrar tus entrenos de gimnasio desde el móvil. Funciona como **PWA**: la abres en Chrome, la instalas en la pantalla de inicio y va sin conexión. Todos los datos se guardan **en local** en tu dispositivo.

## Qué tiene

- **Progreso**: estadísticas (entrenos del mes, volumen semanal, racha), gráfica por ejercicio (peso máximo, 1RM estimado, volumen), volumen por sesión, peso, % de grasa y cintura, e historial de entrenos (puedes verlos, editarlos o borrarlos). Se filtra por tipo de día.
- **+ Entreno**: eliges Push, Pull, Legs, Upper, Lower o Libre y te aparecen los ejercicios de ese día. Pones el peso con la barra deslizante o los botones −/+, las repeticiones con −/+ o con los atajos (5·8·10·12·15), y registras serie a serie. Ves lo que hiciste la última vez, se detectan los PRs y puedes añadir ejercicios extra (abdominales, lo que sea). La fecha y el cronómetro se ponen solos.
- **Modo Reto 🔥**: al elegir el día puedes escoger *Normal* o *Reto*. En el Reto, la app te pone para cada ejercicio un peso que te obliga a llegar al fallo, calculado con tus entrenos anteriores. Toma tu mejor 1RM estimado de las últimas 3 sesiones, le suma un 2 % (un 3 % si vas mejorando) y lo convierte al peso que toca para tus repeticiones objetivo; además, siempre queda por encima de lo que hiciste la última vez. En los ejercicios con tu propio peso, el reto es hacer más repeticiones. Para que el Reto se desbloquee necesitas 2 sesiones registradas en al menos la mitad de los ejercicios de ese día; mientras tanto, la app te enseña cuánto te falta. Cada serie que llega al objetivo se marca en verde, y los entrenos hechos en Reto aparecen marcados en el historial.
- **Rutinas**: creas, renombras, reordenas y eliminas días (Full body, Brazo, Pierna B…). Un día nuevo puede empezar vacío o copiar los ejercicios de otro. Si eliminas un día, sus entrenos se quedan en el historial. Dentro de cada día configuras qué ejercicios lleva, con series × repeticiones y su orden. Biblioteca de 26 ejercicios con iconos de silueta, y puedes crear los tuyos.
- **Ajustes** (rueda arriba a la derecha): perfil, medidas corporales con historial (IMC, masa magra y FFMI se calculan solos), PRs manuales y automáticos, cuánto sube el peso con cada toque, y copia de seguridad para exportar e importar en JSON.

## Publicar en GitHub Pages

1. Crea un repositorio nuevo en GitHub (por ejemplo `forja`).
2. Sube **el contenido** de esta carpeta a la raíz del repo (`index.html` tiene que quedar en la raíz):
   ```bash
   git init
   git add .
   git commit -m "FORJA v1"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/forja.git
   git push -u origin main
   ```
   Si no usas la terminal, en GitHub puedes ir a **Add file → Upload files** y arrastrar todos los archivos y carpetas.
3. En el repo, entra en **Settings → Pages**. En *Source* elige **Deploy from a branch**, rama `main` y carpeta `/ (root)`, y pulsa **Save**.
4. En uno o dos minutos la app estará en `https://TU_USUARIO.github.io/forja/`.

## Instalarla en el móvil

Abre la URL de GitHub Pages **en Chrome**. Cuando la app se puede instalar, aparece un aviso **Instala FORJA** en Progreso; también tienes el botón en **Ajustes → App**. Otra forma es el menú **⋮ → Instalar app**.

Si no te deja instalarla, en **Ajustes → App → Cómo** la propia app comprueba lo que falla:
- **Conexión segura (https):** tiene que abrirse desde `https://…github.io/…`. Desde un archivo descargado o dentro del zip no se puede instalar.
- **Navegador Chrome:** si abriste el enlace desde WhatsApp, Instagram o la app de GitHub, estás en su navegador interno. Toca ⋮ → *Abrir en Chrome*.
- **Manifiesto y service worker:** `manifest.webmanifest` y `sw.js` tienen que estar en la misma carpeta que `index.html`.

**Si Chrome dice "esta aplicación ya está instalada" pero al abrirla da error,** es que queda una instalación antigua rota:
1. Mantén pulsado el icono → *Desinstalar*. Si no aparece, ve a Ajustes de Android → Aplicaciones → Forja.
2. Cierra Chrome, vuelve a abrir la web y elige ⋮ → *Instalar app*.

**Ojo si tienes otras apps en el mismo `tuusuario.github.io` (por ejemplo Bonsai):** todas comparten el mismo sitio para Chrome. No uses *Borrar y restablecer* en github.io, porque borrarías también sus datos. Además, si otra app está en la raíz (`tuusuario.github.io`) o su manifiesto tiene `"scope": "/"`, Chrome cree que Forja forma parte de ella. Para que convivan, el `scope` y el `start_url` de esa app tienen que limitarse a su propia carpeta (por ejemplo `/bonsai/`).

No cambies `start_url`, `scope` ni el nombre del repositorio una vez instalada: Chrome identifica la app por esa dirección.

## Estructura

```
index.html             Página principal
manifest.webmanifest   Datos de la app instalable (nombre, icono, colores)
sw.js                  Service worker: hace que funcione sin conexión
css/styles.css         Estilos (gris oscuro + naranja rojizo)
js/data.js             Iconos, ejercicios y rutinas que vienen de serie
js/app.js              Lógica de la app
icons/                 Icono de la app (SVG + PNG)
.nojekyll              Hace que GitHub Pages sirva los archivos tal cual
```

Sin frameworks ni dependencias: HTML, CSS y JavaScript puro. La tipografía (Inter Tight para títulos y cifras, Inter para el texto) se carga desde Google Fonts.

## Sobre los datos

Todo se guarda en el `localStorage` del navegador, solo en ese dispositivo. Si borras los datos de navegación de Chrome, se borran también los de la app. Por eso conviene usar **Ajustes → Exportar copia de seguridad** de vez en cuando. Para pasar tus datos a otro móvil, exportas en uno e importas en el otro.

## Actualizar la app

Cuando cambies archivos, sube la versión en `sw.js` (por ejemplo, de `forja-v6` a `const CACHE = 'forja-v7'`) para que los móviles que ya la tienen instalada descarguen la versión nueva.
