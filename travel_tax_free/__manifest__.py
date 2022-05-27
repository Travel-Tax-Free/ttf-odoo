# -*- coding: utf-8 -*-
# Travel Tax Free 2022 ©

{
    'name': 'Travel Tax Free Integration',
    'version': '1.0',
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
    #    'security/ir.model.access.csv',

        'static/src/xml/pos_templates.xml',

        'data/data.xml',
        'views/res_partner_view.xml',
        'views/res_country_view.xml',
        'views/account_move_view.xml',
        'views/res_config_settings.xml',
     #   'views/pos_config_view.xml',
     #   'views/product_template_view.xml',
        'wizard/send_ttf_wizard_view.xml',
    ],
    'qweb': [
        'static/src/xml/pos.xml',
    ],
    'installable': True,
}
