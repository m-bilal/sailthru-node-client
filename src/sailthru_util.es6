import * as crypto from 'crypto';
import * as util from 'util'
import VERSION from './sailthru'

export class SailthruUtil {
    static getSignatureHash(params, secret) {
        return SailthruUtil.md5(SailthruUtil.getSignatureString(params, secret));
    }

    static getSignatureString(params, secret) {
        return secret + SailthruUtil.extractParamValues(params).sort().join('');
    }

    static md5(data) {
        let md5 = crypto.createHash('md5');
        md5.update(data, 'utf8');
        return md5.digest('hex');
    }

    static extractParamValues(params) {
        var values = [];
        for (let k in params) {
            let v = params[k];
            // console.log(v)
            if (v instanceof Array) {
                let temp = SailthruUtil.extractParamValues(v);
                values = values.concat(temp);
            } else if (typeof v === 'string' || typeof v === 'number') {
                values.push(v);
            } else if (typeof v === 'boolean') {
                values.push(v ? 1 : 0)
            } else {
                values = values.concat(SailthruUtil.extractParamValues(v))
            }
        }
        return values;
    }
}

export function log(string) {
    return util.log(`sailthru-client ${VERSION} - ${string}`);
}