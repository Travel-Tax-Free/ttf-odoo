Integración ODOO 13 con Travel Tax Free
=======================================

Requisitos
----------
* Módulo account
* Librería pycountry (pip3 install pycountry==22.3.5)

Configuración
-------------
Dentro de ajustes -> Travel Tax Free, tendremos las siguientes opciones:
* URL de conexión. Seleccione Demo para el entorno de pruebas y Producción para real.
* Usuario. Usuario facilitado por Travel Tax Free
* Password. Password facilitado por Travel Tax Free
* Adjuntar documento. Asocia un PDF con el documento tax free al modelo correspondiente
* Enviar número de serie. Si los objetos tienen número de serie, la AEAT exige su envío. Active esta opción para que coja el campo código de barras como número de serie en el caso de que exista
* Formato. Dependiendo de la selección, el documento tax free será un A4 o un ticket

Funcionamiento
--------------
Desde las facturas de clientes aparece una nueva opción que es "Enviar tax free". Automáticamente se conectará a los servidores de Travel Tax Free para darlo de alta y se descargará el documento PDF correspondiente. En el caso de que se haya elegido la opción de "Adjuntar", se guardará el PDF junto la factura. En todo caso, registrará el número de tax free en el campo correspondiente de la factura.

Para que la operación se lleve con éxito, el turista tiene que tener definido un país de residencia, la fecha de nacimiento y un pasaporte. En caso contrario, advertirá al usuario del problema.

NOTA: Puede ser que su navegador bloquee las ventanas emergentes. Para evitarlo, establezca las opciones de permitir ventanas emergentes para odoo en su navegador
