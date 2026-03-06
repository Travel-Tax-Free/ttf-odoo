# -*- coding: utf-8 -*-
# Travel Tax Free 2024 ©

{
    'name': 'Travel Tax Free Integration',
    'version': '1.11',
    'author': 'Travel Tax Free',
    'description': """
Travel Tax Free Integration
""",
    'category': 'Taxfree',
    'depends': [
        'base',
        'account',
        'point_of_sale',
    ],
    'data': [
    #    'security/groups.xml',
        'security/ir.model.access.csv',
        'data/data.xml',
        'views/res_partner_view.xml',
        'views/res_country_view.xml',
        'views/account_move_view.xml',
        'views/res_config_settings.xml',
        'views/travel_users_view.xml',
        'views/pos_config_view.xml',
     #   'views/product_template_view.xml',
        'wizard/send_ttf_wizard_view.xml',
    ],
    'qweb': [

    ],
    'installable': True,
    'assets':{
        'web.assets_backend': [
            'travel_tax_free/static/src/js/mrz_scanner_widget.js',
            'travel_tax_free/static/src/xml/mrz_scanner_widget.xml',
        ],
        'point_of_sale._assets_pos': [
            "travel_tax_free/static/src/js/models.js",
            "travel_tax_free/static/src/js/pos_invoice_taxfree.js",
            "travel_tax_free/static/src/js/pos_print_taxfree.js",
            "travel_tax_free/static/src/js/iso3166.js",
            "travel_tax_free/static/src/js/mrz_scanner_widget.js",
            "travel_tax_free/static/src/xml/pos_invoice_taxfree.xml",
            "travel_tax_free/static/src/xml/pos_print_taxfree.xml",
            "travel_tax_free/static/src/xml/mrz_scanner_widget.xml",
        ],
    },
}
