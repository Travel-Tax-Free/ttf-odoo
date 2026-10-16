# -*- coding: utf-8 -*-
# TraveltaxFree 2026
import base64
from unittest.mock import patch

from dateutil.relativedelta import relativedelta
from psycopg2 import IntegrityError

from odoo import Command, fields
from odoo.exceptions import AccessError, ValidationError
from odoo.tests import new_test_user, tagged
from odoo.tools import mute_logger

from odoo.addons.account.tests.common import AccountTestInvoicingCommon
from odoo.addons.travel_tax_free.controllers.travel_client import TravelClient
from odoo.addons.travel_tax_free.controllers.travel_request import TravelRequest

PDF = base64.b64encode(b'%PDF-1.4 tax free de prueba').decode()
ID_INEXISTENTE = 999999999
CATALOGO = [
    'taxfree_activity_alimentacion',
    'taxfree_activity_alcohol',
    'taxfree_activity_cultura',
    'taxfree_activity_deporte',
    'taxfree_activity_electrodomesticos',
    'taxfree_activity_hogar',
    'taxfree_activity_informatica',
    'taxfree_activity_moda',
    'taxfree_activity_joyeria',
    'taxfree_activity_perfumeria',
    'taxfree_activity_descuentos',
    'taxfree_activity_mascotas',
]


@tagged('post_install', '-at_install')
class TestTravelTaxFree(AccountTestInvoicingCommon):
    """Tests de travel_tax_free. La API nunca se llama: se sustituye
    TravelRequest.generate_taxfree por un simulacro."""

    @classmethod
    def get_default_groups(cls):
        # Quien emite el tax free desde el TPV es un usuario del TPV.
        return super().get_default_groups() | cls.quick_ref('point_of_sale.group_pos_user')

    @classmethod
    def setUpClass(cls):
        super().setUpClass()

        # Los tests no heredan la configuración de la base de datos: cada uno
        # activa lo que necesita.
        params = cls.env['ir.config_parameter'].sudo()
        params.set_param('base.taxfree_activity_id', False)
        params.set_param('base.taxfree_serial', False)

        cls.country_jp = cls.env.ref('base.jp')
        cls.country_jp.aeat_allow = True
        cls.country_uk = cls.env.ref('base.uk')
        cls.country_uk.aeat_allow = True
        cls.country_es = cls.env.ref('base.es')
        cls.country_es.aeat_allow = False
        cls.tourist = cls.env['res.partner'].create(cls._tourist_vals())

        # TravelClient exige un usuario por defecto, y solo puede haber uno.
        if not cls.env['travel.users'].search([('default', '=', True)], limit=1):
            cls.env['travel.users'].create({
                'name': 'Usuario de prueba',
                'user': 'usuario_test',
                'key': 'key_test',
                'default': True,
            })

        cls.activity_product = cls.env.ref('travel_tax_free.taxfree_activity_moda')
        cls.activity_shop = cls.env.ref('travel_tax_free.taxfree_activity_joyeria')
        cls.activity_pos = cls.env.ref('travel_tax_free.taxfree_activity_perfumeria')
        cls.product_with = cls._create_product(name='Producto con actividad')
        cls.product_with.activity_id = cls.activity_product
        cls.product_without = cls._create_product(name='Producto sin actividad')

    # ------------------------------------------------------------------
    # Utilidades
    # ------------------------------------------------------------------

    @classmethod
    def _tourist_vals(cls, **vals):
        return {
            'name': 'Turista de prueba',
            'is_company': False,
            'country_id': cls.country_jp.id,
            'passport': 'TEST12345',
            'date_birthdate': '1990-01-01',
            **vals,
        }

    def _set_param(self, key, value):
        # set_param con False borra el parámetro, que es como queda sin configurar.
        self.env['ir.config_parameter'].sudo().set_param(key, value)

    def _line(self, product=None, **vals):
        """Línea con IVA de product_a; product=False deja la línea sin producto."""
        vals.setdefault('tax_ids', self.tax_sale_a)
        if product is None:
            product = self.product_a
        return self._prepare_invoice_line(product_id=product or None, **vals)

    def _create_taxfree_invoice(self, lines=None, post=True, **vals):
        # Sin posición fiscal: la de un turista extracomunitario puede quitar el
        # IVA, y una factura sin IVA no pasa test_taxfree_invoice.
        vals.setdefault('partner_id', self.tourist)
        return self._create_invoice(
            invoice_line_ids=lines or [self._line()],
            fiscal_position_id=False,
            post=post,
            **vals,
        )

    def _create_pos_invoice(self, pos_activity, lines=None):
        """Factura enlazada a un pedido de un TPV con la actividad dada."""
        config = self.env['pos.config'].sudo().create({
            'name': 'TPV de prueba',
            'taxfree_activity_id': pos_activity.id,
        })
        session = self.env['pos.session'].sudo().create({'config_id': config.id})
        invoice = self._create_taxfree_invoice(lines=lines)
        self.env['pos.order'].sudo().create({
            'session_id': session.id,
            'company_id': config.company_id.id,
            'amount_tax': 0.0,
            'amount_total': 0.0,
            'amount_paid': 0.0,
            'amount_return': 0.0,
            'account_move': invoice.id,
        })
        self.assertEqual(invoice.pos_order_ids.config_id, config)
        return invoice

    def _two_lines(self):
        return [self._line(self.product_with), self._line(self.product_without)]

    def _mock_api(self, response=None):
        return patch.object(
            TravelRequest, 'generate_taxfree',
            return_value=response if response is not None else {'number': 'TEST'},
        )

    def _send(self, invoice, response=None, **client_kwargs):
        """Lanza TravelClient.generate_taxfree y devuelve su respuesta y el simulacro."""
        with self._mock_api(response) as mock:
            result = TravelClient(self.env, **client_kwargs).generate_taxfree(invoice)
        return result, mock

    def _payload(self, invoice, **client_kwargs):
        """Devuelve el diccionario que se habría enviado a la API."""
        result, mock = self._send(invoice, **client_kwargs)
        self.assertEqual(result['code'], '0000', result)
        mock.assert_called_once()
        return mock.call_args.args[0]

    def _activities(self, invoice):
        """Líneas del cheque por nombre de producto."""
        lines = self._payload(invoice)['check_lines']
        return {line['name']: line for line in lines}

    def _alta(self, invoice, response=None, **kwargs):
        with self._mock_api(response or {'number': 'TF-0001', 'check': PDF}):
            return invoice.generate_taxfree_from_invoice(**kwargs)

    def _assert_solo_lectura(self, user):
        activity = self.activity_product.with_user(user)
        self.assertEqual(activity.alias, self.activity_product.alias)
        cases = [
            ('crear', lambda: self.env['product.activity'].with_user(user).create(
                {'name': 'Nueva', 'alias': 'NUE'})),
            ('editar', lambda: activity.write({'name': 'Cambiada'})),
            ('borrar', lambda: activity.unlink()),
        ]
        for name, action in cases:
            with self.subTest(accion=name), self.assertRaises(AccessError):
                action()

    # ------------------------------------------------------------------
    # Actividad de cada línea del cheque
    # ------------------------------------------------------------------

    ## TEST 1: Actividad por línea con la de Ajustes configurada
    #Factura con dos líneas: la del producto con actividad lleva su alias y la del producto sin actividad lleva el de Ajustes
    def test_01_actividad_con_ajustes(self):
        self._set_param('base.taxfree_activity_id', str(self.activity_shop.id))

        lines = self._activities(self._create_taxfree_invoice(lines=self._two_lines()))

        self.assertEqual(lines['Producto con actividad']['activity'], self.activity_product.alias)
        self.assertEqual(lines['Producto sin actividad']['activity'], self.activity_shop.alias)

    ## TEST 2: Actividad por línea sin la de Ajustes
    #Misma factura sin base.taxfree_activity_id: la línea con actividad lleva su alias y la otra va sin 'activity'
    def test_02_actividad_sin_ajustes(self):
        lines = self._activities(self._create_taxfree_invoice(lines=self._two_lines()))

        self.assertEqual(lines['Producto con actividad']['activity'], self.activity_product.alias)
        self.assertNotIn('activity', lines['Producto sin actividad'])

    ## TEST 3: Actividad del TPV
    #En una factura del TPV, la línea sin actividad lleva la del TPV aunque haya otra en Ajustes; la del producto sigue mandando
    def test_03_actividad_del_tpv(self):
        self._set_param('base.taxfree_activity_id', str(self.activity_shop.id))

        lines = self._activities(self._create_pos_invoice(self.activity_pos, lines=self._two_lines()))

        self.assertEqual(lines['Producto con actividad']['activity'], self.activity_product.alias)
        self.assertEqual(lines['Producto sin actividad']['activity'], self.activity_pos.alias)

    ## TEST 4: TPV sin actividad
    #Si el TPV no tiene actividad, la línea sin actividad lleva la de Ajustes
    def test_04_tpv_sin_actividad(self):
        self._set_param('base.taxfree_activity_id', str(self.activity_shop.id))

        lines = self._activities(self._create_pos_invoice(
            self.env['product.activity'], lines=self._two_lines()))

        self.assertEqual(lines['Producto sin actividad']['activity'], self.activity_shop.alias)

    ## TEST 5: Actividad de Ajustes borrada
    #Si base.taxfree_activity_id apunta a una actividad que ya no existe, el alta sigue y la línea va sin 'activity'
    def test_05_actividad_de_ajustes_borrada(self):
        deleted = self.env['product.activity'].sudo().create({'name': 'Borrada', 'alias': 'BOR'})
        self._set_param('base.taxfree_activity_id', str(deleted.id))
        deleted.unlink()

        lines = self._activities(self._create_taxfree_invoice(lines=self._two_lines()))

        self.assertNotIn('activity', lines['Producto sin actividad'])

    # ------------------------------------------------------------------
    # Categorías y permisos
    # ------------------------------------------------------------------

    ## TEST 6: Categoría en el producto
    #Un producto se crea sin categoría, se le asigna una, se le quita, y sus variantes ven siempre la de la plantilla
    def test_06_categoria_en_producto(self):
        attribute = self.env['product.attribute'].create({
            'name': 'Talla de prueba',
            'value_ids': [Command.create({'name': 'S'}), Command.create({'name': 'M'})],
        })
        template = self.env['product.template'].create({
            'name': 'Producto con variantes',
            'attribute_line_ids': [Command.create({
                'attribute_id': attribute.id,
                'value_ids': [Command.set(attribute.value_ids.ids)],
            })],
        })
        self.assertEqual(len(template.product_variant_ids), 2)
        self.assertFalse(template.activity_id)

        template.activity_id = self.activity_product
        for variant in template.product_variant_ids:
            self.assertEqual(variant.activity_id, self.activity_product)

        template.activity_id = False
        self.assertFalse(template.activity_id)
        self.assertFalse(template.product_variant_ids.activity_id)

    ## TEST 7: Categoría visible en las fichas
    #Las vistas de formulario del producto y del TPV incluyen su actividad
    def test_07_categoria_en_vistas(self):
        for model, xmlid, field in [
            ('product.template', 'product.product_template_only_form_view', 'activity_id'),
            ('pos.config', 'point_of_sale.pos_config_view_form', 'taxfree_activity_id'),
        ]:
            with self.subTest(vista=xmlid):
                arch = self.env[model].get_view(self.env.ref(xmlid).id, 'form')['arch']
                self.assertIn('name="{}"'.format(field), arch)

    ## TEST 8: Catálogo de categorías
    #Las 12 categorías de data/activity.xml existen y no se puede repetir un alias
    def test_08_catalogo_y_alias_unico(self):
        for xmlid in CATALOGO:
            with self.subTest(xmlid=xmlid):
                self.assertTrue(self.env.ref('travel_tax_free.' + xmlid, raise_if_not_found=False))

        # sudo: nadie tiene permiso de creación, y aquí se prueba la base de datos.
        with self.assertRaises(IntegrityError), mute_logger('odoo.sql_db'), self.env.cr.savepoint():
            self.env['product.activity'].sudo().create(
                {'name': 'Repetida', 'alias': self.activity_product.alias})
            self.env.flush_all()

    ## TEST 9: Usuario interno solo lee categorías
    #Un usuario interno lee product.activity, y al crear, editar o borrar recibe AccessError
    def test_09_permisos_usuario_interno(self):
        user = new_test_user(self.env, login='ttf_interno', groups='base.group_user')
        self._assert_solo_lectura(user)

    ## TEST 10: Administrador tampoco gestiona categorías
    #El administrador recibe AccessError al crear, editar o borrar product.activity
    def test_10_permisos_administrador(self):
        self._assert_solo_lectura(self.env.ref('base.user_admin'))

    ## TEST 11: Asignar categoría sin permisos sobre ellas
    #Un usuario que puede editar productos asigna y quita activity_id sin permisos de escritura en product.activity
    def test_11_asignar_categoria_sin_gestionarlas(self):
        user = new_test_user(
            self.env, login='ttf_productos',
            groups='base.group_user,product.group_product_manager',
        )
        template = self.product_a.product_tmpl_id.with_user(user)

        template.activity_id = self.activity_product
        self.assertEqual(template.activity_id, self.activity_product)
        template.activity_id = False
        self.assertFalse(template.activity_id)

    # ------------------------------------------------------------------
    # Lo que se envía a la API
    # ------------------------------------------------------------------

    ## TEST 12: Líneas del cheque
    #Las líneas sin IVA no se envían; quantity y tax_percent van como enteros y total es el price_total
    def test_12_lineas_cheque(self):
        invoice = self._create_taxfree_invoice(lines=[
            self._line(quantity=3),
            self._line(price_unit=50.0, name='Línea sin IVA', product=False,
                       tax_ids=self.env['account.tax']),
        ])
        taxed = invoice.invoice_line_ids.filtered('tax_ids')

        lines = self._payload(invoice)['check_lines']

        self.assertEqual(len(lines), 1)
        self.assertEqual(lines[0]['name'], taxed.name)
        self.assertEqual(lines[0]['quantity'], 3)
        self.assertIsInstance(lines[0]['quantity'], int)
        self.assertEqual(lines[0]['tax_percent'], int(self.tax_sale_a.amount))
        self.assertIsInstance(lines[0]['tax_percent'], int)
        self.assertEqual(lines[0]['total'], taxed.price_total)

    ## TEST 13: Número de serie
    #Con base.taxfree_serial activo y barcode en el producto la línea lleva 'serial'; sin el parámetro, no
    def test_13_numero_serie(self):
        self.product_a.barcode = 'TTF-TEST-0001'
        invoice = self._create_taxfree_invoice()

        with self.subTest(serial='activo'):
            self._set_param('base.taxfree_serial', 'True')
            line = self._payload(invoice)['check_lines'][0]
            self.assertEqual(line['serial'], 'TTF-TEST-0001')

        with self.subTest(serial='inactivo'):
            self._set_param('base.taxfree_serial', False)
            line = self._payload(invoice)['check_lines'][0]
            self.assertNotIn('serial', line)

    ## TEST 14: Datos del turista
    #País de pasaporte (por defecto el de residencia), zip y email solo si existen, y fecha de nacimiento en AAAAMMDD
    def test_14_datos_turista(self):
        invoice = self._create_taxfree_invoice()

        with self.subTest(turista='mínimo'):
            data = self._payload(invoice)
            self.assertEqual(data['tourist_name'], self.tourist.name)
            self.assertEqual(data['tourist_passport'], self.tourist.passport)
            self.assertEqual(data['tourist_resident_country'], 'JP')
            self.assertEqual(data['tourist_passport_country'], 'JP')
            self.assertEqual(data['tourist_birthdate'], '19900101')
            self.assertEqual(data['invoice_number'], invoice.name)
            self.assertNotIn('tourist_zip', data)
            self.assertNotIn('tourist_email', data)

        with self.subTest(turista='completo'):
            self.tourist.write({
                'passport_country_id': self.env.ref('base.us').id,
                'zip': '100-0001',
                'email': 'turista@example.invalid',
            })
            data = self._payload(invoice)
            self.assertEqual(data['tourist_resident_country'], 'JP')
            self.assertEqual(data['tourist_passport_country'], 'US')
            self.assertEqual(data['tourist_zip'], '100-0001')
            self.assertEqual(data['tourist_email'], 'turista@example.invalid')

    ## TEST 15: Entorno y formato
    #La URL depende de base.taxfree_url y print_size de base.taxfree_format, salvo que se pase format
    def test_15_entorno_y_formato(self):
        for value, url in [('produccion', 'https://ws-es.traveltaxfree.com'),
                           ('demo', 'https://demo-es.traveltaxfree.com'),
                           (False, 'https://demo-es.traveltaxfree.com')]:
            with self.subTest(taxfree_url=value):
                self._set_param('base.taxfree_url', value)
                self.assertEqual(TravelClient(self.env).url, url)

        invoice = self._create_taxfree_invoice()
        self._set_param('base.taxfree_format', 'A4')
        with self.subTest(formato='parámetro'):
            self.assertEqual(self._payload(invoice)['print_size'], 'A4')
        with self.subTest(formato='argumento'):
            self.assertEqual(self._payload(invoice, format='ticket')['print_size'], 'ticket')

    # ------------------------------------------------------------------
    # Errores y respuestas de TravelClient
    # ------------------------------------------------------------------

    ## TEST 16: Errores antes de llamar a la API
    #Sin factura devuelve 9986 y sin turista 9987, y en ninguno de los dos casos se llama a la API
    def test_16_errores_previos(self):
        without_partner = self._create_taxfree_invoice(post=False, partner_id=False)
        for case, invoice, code in [('sin factura', self.env['account.move'], '9986'),
                                    ('sin turista', without_partner, '9987')]:
            with self.subTest(caso=case):
                result, mock = self._send(invoice)
                self.assertEqual(result['code'], code)
                mock.assert_not_called()

    ## TEST 17: Respuestas de la API
    #Con 'number' devuelve 0000, con 'message' devuelve 9585 y con cualquier otra cosa la devuelve tal cual
    def test_17_respuestas_api(self):
        invoice = self._create_taxfree_invoice()
        cases = [
            ('number', {'number': 'TF-0001'}, {'number': 'TF-0001', 'code': '0000'}),
            ('message', {'message': 'Fallo en la API'}, {'code': '9585', 'msg': 'Fallo en la API'}),
            ('desconocida', {'otra': 'cosa'}, {'otra': 'cosa'}),
        ]
        for case, response, expected in cases:
            with self.subTest(respuesta=case):
                result, mock = self._send(invoice, response=response)
                mock.assert_called_once()
                self.assertEqual(result, expected)

    ## TEST 18: Sin usuario tax free por defecto
    #Sin usuario por defecto ni usuario en el TPV lanza ValidationError
    def test_18_sin_usuario_por_defecto(self):
        self.env['travel.users'].search([('default', '=', True)]).default = False
        invoice = self._create_taxfree_invoice()

        with self._mock_api() as mock:
            with self.assertRaisesRegex(ValidationError, 'No se ha encontrado usuario por defecto'):
                self._send(invoice)
        mock.assert_not_called()

    ## TEST 19: Solo un usuario por defecto
    #Crear un segundo travel.users con default=True lanza ValidationError
    def test_19_un_solo_usuario_por_defecto(self):
        with self.assertRaisesRegex(ValidationError, 'Ya existe un usuario por defecto'):
            self.env['travel.users'].create({
                'name': 'Segundo por defecto',
                'user': 'otro_usuario_test',
                'key': 'otra_key_test',
                'default': True,
            })

    # ------------------------------------------------------------------
    # Validación del turista
    # ------------------------------------------------------------------

    ## TEST 20: Turista válido
    #Un turista completo de un país permitido devuelve 0000, y un turista de GB con código postal también
    def test_20_turista_valido(self):
        tourist_gb = self.env['res.partner'].create(
            self._tourist_vals(country_id=self.country_uk.id, zip='NW1 6XE'))

        for case, tourist in [('JP', self.tourist), ('GB', tourist_gb)]:
            with self.subTest(turista=case):
                self.assertEqual(tourist.test_tourist(), {'code': '0000'})

    ## TEST 21: Turista rechazado
    #Empresa, nombre o pasaporte cortos, sin país, país no permitido, sin fecha, menor de 5 años, GB sin zip y zip BT devuelven 9587
    def test_21_turista_rechazado(self):
        four_years_ago = fields.Date.today() - relativedelta(years=4)
        cases = [
            ('empresa', {'is_company': True}, 'persona fisica'),
            ('nombre corto', {'name': 'Al'}, 'Nombre del turista'),
            ('pasaporte corto', {'passport': 'AB'}, 'Pasaporte del turista'),
            ('sin país', {'country_id': False}, 'Falta pais'),
            ('país no permitido', {'country_id': self.country_es.id}, 'no permitido'),
            ('sin fecha', {'date_birthdate': False}, 'Falta fecha de nacimiento'),
            ('menor de 5 años', {'date_birthdate': four_years_ago}, 'menos de 5'),
            ('GB sin zip', {'country_id': self.country_uk.id, 'zip': False}, 'codigo postal'),
            ('GB con zip BT', {'country_id': self.country_uk.id, 'zip': 'BT1 1AA'}, 'Irlanda del Norte'),
        ]
        for case, vals, msg in cases:
            with self.subTest(caso=case):
                tourist = self.env['res.partner'].create(self._tourist_vals(**vals))
                result = tourist.test_tourist()
                self.assertEqual(result['code'], '9587')
                self.assertIn(msg, result['msg'])

    ## TEST 22: Registros inexistentes
    #test_tourist_id, generate_taxfree_from_order_id y generate_taxfree_from_order_name con un registro que no existe devuelven 404
    def test_22_registros_inexistentes(self):
        cases = [
            ('test_tourist_id', lambda: self.env['res.partner'].test_tourist_id(ID_INEXISTENTE)),
            ('generate_taxfree_from_order_id',
             lambda: self.env['pos.order'].generate_taxfree_from_order_id(ID_INEXISTENTE)),
            ('generate_taxfree_from_order_name',
             lambda: self.env['pos.order'].generate_taxfree_from_order_name('TTF-NO-EXISTE')),
        ]
        for case, call in cases:
            with self.subTest(metodo=case):
                self.assertEqual(call()['code'], '404')

    # ------------------------------------------------------------------
    # Factura, alta y desvinculación
    # ------------------------------------------------------------------

    ## TEST 23: Factura rechazada
    #Borrador, importe <= 0, sin IVA, con taxfree ya asociado o con una línea de dos impuestos devuelven 9586
    def test_23_factura_rechazada(self):
        with_taxfree = self._create_taxfree_invoice()
        with_taxfree.taxfree = 'TF-PREVIO'
        cases = [
            ('borrador', self._create_taxfree_invoice(post=False), 'estado incorrecto'),
            ('importe 0', self._create_taxfree_invoice(lines=[self._line(price_unit=0.0)]),
             'importe total <= 0'),
            ('sin IVA', self._create_taxfree_invoice(lines=[self._line(tax_ids=self.env['account.tax'])]),
             'no tiene IVA'),
            ('con taxfree', with_taxfree, 'ya tiene el taxfree'),
            ('dos impuestos',
             self._create_taxfree_invoice(lines=[self._line(tax_ids=self.tax_sale_a + self.tax_sale_b)]),
             'más de un tipo de IVA'),
        ]
        for case, invoice, msg in cases:
            with self.subTest(caso=case):
                result = invoice.test_taxfree_invoice()
                self.assertEqual(result['code'], '9586')
                self.assertIn(msg, result['msg'])

    ## TEST 24: Alta correcta
    #Guarda el número en la factura y crea el PDF adjunto solo si base.taxfree_attach está activo
    def test_24_alta_correcta(self):
        with self.subTest(adjunto='activo'):
            self._set_param('base.taxfree_attach', 'True')
            invoice = self._create_taxfree_invoice()
            self._alta(invoice)
            self.assertEqual(invoice.taxfree, 'TF-0001')
            self.assertEqual(invoice.taxfree_id.name, 'TF-0001.pdf')
            self.assertEqual(invoice.taxfree_id.res_model, 'account.move')
            self.assertEqual(invoice.taxfree_id.res_id, invoice.id)

        with self.subTest(adjunto='inactivo'):
            self._set_param('base.taxfree_attach', False)
            invoice = self._create_taxfree_invoice()
            self._alta(invoice)
            self.assertEqual(invoice.taxfree, 'TF-0001')
            self.assertFalse(invoice.taxfree_id)

    ## TEST 25: Error en el alta
    #Desde el TPV (pos=True) devuelve el error; desde el backend lanza ValidationError con el mensaje de su código
    def test_25_error_en_alta(self):
        api_error = {'message': 'Fallo en la API'}

        with self.subTest(origen='TPV'):
            invoice = self._create_taxfree_invoice()
            result = self._alta(invoice, response=api_error, pos=True)
            self.assertEqual(result, {'code': '9585', 'msg': 'Fallo en la API'})
            self.assertFalse(invoice.taxfree)

        bad_tourist = self.env['res.partner'].create(self._tourist_vals(passport='AB'))
        cases = [
            ('9585', self._create_taxfree_invoice(), api_error, 'Error del servidor Tax Free'),
            ('9587', self._create_taxfree_invoice(partner_id=bad_tourist), None,
             'El turista no pasa las verificaciones'),
            ('9586', self._create_taxfree_invoice(post=False), None,
             'La factura no pasa las verificaciones'),
            ('sin code', self._create_taxfree_invoice(), {'otra': 'cosa'}, 'Error creando tax free'),
        ]
        for case, invoice, response, msg in cases:
            with self.subTest(origen='backend', caso=case):
                with self.assertRaisesRegex(ValidationError, msg):
                    self._alta(invoice, response=response)
                self.assertFalse(invoice.taxfree)

    ## TEST 26: Desvincular tax free
    #Vacía taxfree y taxfree_id y borra el adjunto; sin taxfree asociado lanza ValidationError
    def test_26_desvincular(self):
        self._set_param('base.taxfree_attach', 'True')
        invoice = self._create_taxfree_invoice()
        self._alta(invoice)
        attachment = invoice.taxfree_id
        self.assertTrue(attachment)

        invoice.remove_taxfree()
        self.assertFalse(invoice.taxfree)
        self.assertFalse(invoice.taxfree_id)
        self.assertFalse(attachment.exists())

        with self.assertRaisesRegex(ValidationError, 'no tiene un taxfree asociado'):
            invoice.remove_taxfree()
