Integración ODOO 19 con Travel Tax Free
=======================================

Requisitos
----------
* Módulo account
* Módulo point_of_sale
* Librería pycountry (pip3 install pycountry==22.3.5)

Configuración
-------------
Dentro de ajustes -> Travel Tax Free, tendremos las siguientes opciones:
* URL de conexión. Seleccione Demo para el entorno de pruebas y Producción para real.
* Usuarios. Se definirán los usuarios/password correspondientes.
* Adjuntar documento. Asocia un PDF con el documento tax free al modelo correspondiente
* Enviar número de serie. Si los objetos tienen número de serie, la AEAT exige su envío. Active esta opción para que coja el campo código de barras como número de serie en el caso de que exista
* Formato. Dependiendo de la selección, el documento tax free será un A4 o un ticket
* Categoría. En el caso de que se requiera, se puede poner que se asigne una categoría a todo cliente que se cree/edit desde la extranet
* Email requerido. Si es true, verificará que lleva email a la hora de guardarlo. Independientemente de su valor, si lleva email verificará que esté en el formato correcto.

En los ajustes del POS, debe de estar activado el check de contabilidad. 

Funcionamiento
--------------
Desde las facturas de clientes aparece una nueva opción que es "Enviar tax free". Automáticamente se conectará a los servidores de Travel Tax Free para darlo de alta y se descargará el documento PDF correspondiente. En el caso de que se haya elegido la opción de "Adjuntar", se guardará el PDF junto la factura. En todo caso, registrará el número de tax free en el campo correspondiente de la factura.

Para que la operación se lleve con éxito, el turista tiene que tener definido un país de residencia, la fecha de nacimiento y un pasaporte. En caso contrario, advertirá al usuario del problema.

Hay que tener en cuenta que para poder hacer un tax free, el producto tiene que llevar obligatoriamente IVA

NOTA: Puede ser que su navegador bloquee las ventanas emergentes. Para evitarlo, establezca las opciones de permitir ventanas emergentes para odoo en su navegador
