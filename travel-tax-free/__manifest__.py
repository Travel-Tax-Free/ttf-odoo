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
        'point_of_sale',
    ],
    'data': [
    #    'security/groups.xml',
    #    'security/ir.model.access.csv',

        'data/data.xml',
        'views/res_partner_view.xml',
        'views/res_country_view.xml',
        'views/pos_order_view.xml',
    ],
    'installable': True,
}
