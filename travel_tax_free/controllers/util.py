
class Utils:

    @staticmethod
    def generate_code(error='9999', msg=None):
        if not msg:
            return {
                'code': '0000'
            }
        else:
            return {
                'code': error,
                'msg': msg
            }