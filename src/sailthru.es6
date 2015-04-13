import * as http from 'http'
import * as https from 'https'
import * as url from 'url'
import * as querystring from 'querystring'
import * as rest from 'restler'
import * as fs from 'fs'

/*
API client version
 */
export const VERSION = '1.0.8';

/*
LOGGING Flag
 */
let LOGGING = true;

const USER_AGENT = 'Sailthru API Node/JavaScript Client';

import {SailthruUtil, log} from './sailthru_util';

/*
helper logging function
 */
function log2(string) {
    if (LOGGING === true) {
        log(string);
    }
}

/*
Private class to make HTTP request
 */
class SailthruRequest {
    static valid_methods = ['GET', 'POST', 'DELETE'];

    _http_request(uri, data, method, callback, binary_data_params = []) {
        let parse_uri = url.parse(uri),
            options = {host: parse_uri.host,
                       port: (parse_uri.protocol == 'https:' ? 443 : 80),
                       path: parse_uri.pathname,
                       method,
                       query: data,
                       headers: {'User-Agent': USER_AGENT,
                                 Host: parse_uri.host}};

        let http_protocol = (options.port === 443 ? https : http);

        let query_string = querystring.stringify(data);

        switch (method) {
            case 'GET':
                options.path += '?' + query_string;
                break;
            case 'DELETE':
                options.path += '?' + query_string;
                options.headers['Content-Length'] = 0;
                break;
            case 'POST':
                options.headers['Content-Length'] = query_string.length;
                options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
                break;
            default:
                // handle error
                return false;
        }

        log2(`${method} Request`);

        let req = http_protocol.request(options, function(res) {
            let body = '';
            res.setEncoding('utf8');
            let statusCode = res.statusCode;
            log2(`Status Code: ${res.statusCode}`);
            res.on('data', function(chunk) {
                body += chunk;
            });
            res.on('end', function() {
                try {
                    let json_response = JSON.parse(body);
                    if (statusCode === 200) {
                        return callback(json_response);
                    } else {
                        let json_err = {statusCode,
                                        error: json_response.error,
                                        errormsg: json_response.errormsg};
                        return callback(json_response, json_err);
                    }
                } catch (error) {
                    let json_err = {statusCode: 0,
                                    error: 0,
                                    errormsg: error.message};
                    return callback(error.message, json_err);
                }
            });
        });
        req.on('error', function(err) {
            return callback(err.message, err);
        });
        req.end();
        if (method === 'POST') {
            req.write(url.format({query: options.query}).replace('?', ''), 'utf8');
        }
    }

    _api_request(uri, data, request_method, callback, binary_data_params = []) {
        return this._http_request(uri, data, request_method, callback, binary_data_params);
    }
}

class SailthruClient {
    /*
    By default enable logging
     */
    static logging = true;

    constructor(api_key, api_secret, api_url = false) {
        this.api_key = api_key;
        this.api_secret = api_secret;
        this.api_url = api_url || 'https://api.sailthru.com';
        this.request = new SailthruRequest;
    }

    /*
    prepare JSON payload
     */
    _json_payload(data) {
        let payload = {api_key: this.api_key,
                       format: 'json',
                       json: JSON.stringify(data)};
        payload.sig = SailthruUtil.getSignatureHash(payload, this.api_secret);
        return payload;
    }

    /*
    Unified function for making request to API request
    Doesn't handle multipart request
     */
    _apiRequest(action, data, method, callback) {
        let _url = url.parse(this.api_url),
            json_payload = this._json_payload(data);
        return this.request._api_request(_url.href + action, json_payload, method, callback);
    }

    enableLogging() {
        LOGGING = true;
    }

    disableLogging() {
        LOGGING = true;
    }

    // Native API methods: GET< DELETE and POST

    /*
    GET call
     */
    apiGet(action, data, callback) {
        return this._apiRequest(action, data, 'GET', callback);
    }

    /*
    POST call
     */
    apiPost(action, data, callback, binary_data_params = []) {
        if (binary_data_params.length > 0) {
            return this.apiPostMultiPart(action, data, callback, binary_data_params);
        } else {
            return this._apiRequest(action, data, 'POST', callback);
        }
    }

    /*
    POST call with Multipart
     */
    apiPostMultiPart(action, data, callback, binary_data_params = []) {
        let binary_data = {};
        for (let param of binary_data_params) {
            let stats = fs.statSync(data[param]);
            binary_data[param] = rest.file(data[param], null, stats.size);
            delete data[param];
        }
        let _url = url.parse(this.api_url),
            json_payload = this._json_payload(data);

        for (let param in binary_data) {
            let value = binary_data[param];
            json_payload[param] = value;
        }

        log2(_url.href + action);
        log2('MultiPart Request');
        log2('JSON Payload: ' + JSON.stringify(json_payload));

        rest.post(_url.href + action, {
            multipart: true,
            'User-Agent': USER_AGENT,
            data: json_payload
        }).on('complete', function (data) {
            return callback(data);
        });
    }

    /*
    DELETE call
     */
    apiDelete(action, data, callback) {
        this._apiRequest(action, data, 'DELETE', callback)}

    /*
    options mixin
     */
    _getOptions(options) {
        if (options !== null) {
            return options;
        } else {
            return {};
        }
    }

    // Email API Call
    getEmail(email, callback) {
        return this.apiGet('email', {email}, callback);
    }

    setEmail(email, callback, options = null) {
        let data = this._getOptions(options);
        data.email = email;
        return this.apiPost('email', data, callback);
    }

    // Send API Call
    send(template, email, callback, options = null) {
        let data = this._getOptions(options);
        data.template = template;
        data.email = email;
        return this.apiPost('send', data, callback);
    }

    multiSend(template, emails, callback, options = null) {
        let data = this._getOptions(options);
        data.template = template;
        if (emails instanceof Array) {
            data.email = emails.join(',');
        } else {
            data.email = emails;
        }
        return this.apiPost('send', data, callback);
    }

    getSend(send_id, callback) {
        return this.apiGet('send', {send_id}, callback);
    }

    cancelSend(sendId, callback) {
        let data = {send_id: sendId};
        return this.apiDelete('send', data, callback);
    }

    // Blast API Call
    getBlast(blastId, callback) {
        let data = {blast_id: blastId};
        return this.apiGet('blast', data, callback);
    }

    deleteBlast(blastId, callback) {
        let data = {blast_id: blastId};
        return this.apiDelete('blast', data, callback);
    }

    cancelBlast(blastId, callback) {
        let data = {blast_id: blastId,
                    schedule_time: ''};
        return this.apiPost('blast', data, callback);
    }

    updateBlast(blastId, callback, options = null) {
        let data = this._getOptions(options);
        data.blast_id = blastId;
        return this.apiPost('blast', data, callback);
    }

    scheduleBlastFromBlast(blastId, scheduleTime, callback, options = null) {
        let data = this._getOptions(options);
        data.blast_id = blastId;
        data.schedule_time = scheduleTime;
        return this.apiPost('blast', data, callback);
    }

    scheduleBlastFromTemplate(blastId, template, list, scheduleTime, callback, options = null) {
        let data = this._getOptions(options);
        data.blast_id = blastId;
        data.copy_template = template;
        data.list = list;
        data.schedule_time = scheduleTime;

        return this.apiPost('blast', data, callback);
    }

    scheduleBlast(name, list, scheduleTime, fromName, fromEmail, subject, contentHtml, contentText, callback, options = null) {
        let data = this._getOptions(options);
        data.name = name;
        data.list = list;
        data.schedule_time = scheduleTime;
        data.from_name = fromName;
        data.from_emai = fromEmail;  // @TODO fix preserved bug
        data.subject = subject;
        data.content_html = contentHtml;
        data.content_text = contentText;

        return this.apiPost('blast', data, callback);
    }

    getTemplates(callback) {
        return this.apiGet('template', {}, callback);
    }

    getTemplate(template, callback) {
        return this.apiGet('template', {template}, callback);
    }

    getTemplateFromRevision(revisionId, callback) {
        let data = {revision: revisionId};
        return this.apiGet('template', data, callback);
    }

    saveTemplate(template, callback, options = null) {
        let data = this._getOptions(options);
        data.template = template;
        return this.apiPost('template', data, callback);
    }

    saveTemplateFromRevision(template, revisionId, callback) {
        let options = {revision: revisionId};
        return this.saveTemplate(template, callback, options);
    }

    deleteTemplate(template, callback) {
        return this.apiDelete('template', {template}, callback);
    }


    // List API Call
    getLists(callback) {
        let data = {list: ''};
        return this.apiGet('list', data, callback);
    }

    deleteList(list, callback) {
        let data = {list};
        return this.apiDelete('list', data, callback);
    }

    // Contacts API Call
    importContacts(email, password, callback, includeNames = true) {
        let data = {email, password};
        if (includeNames === true) {
            data.names = 1;
        }

        return this.apiPost('contacts', data, callback);
    }

    // Content API Call
    pushContent(title, url, callback, options = null) {
        let data = this._getOptions(options);
        data.title = title;
        data.url = url;
        if (data.tags && data.tags instanceof Array) {
            data.tags = data.tags.join(',');
        }
        return this.apiPost('content', data, callback);
    }

    // Alert API Call
    getAlert(email, callback) {
        let data = {email};
        return this.apiGet('alert', data, callback);
    }

    saveAlert(email, type, template, callback, options = null) {
        let data = this._getOptions(options);
        data.email = email;
        data.type = type;
        data.template = template;
        data.when = data.when && type === 'weekly' || type === 'daily' ? data.when : delete data.when;  // @TODO revisit; ugly
        return this.apiPost('alert', data, callback);
    }

    deleteAler(email, alertId, callback) {  // @TODO preserved bug
        let data = {email,
                    alert_id: alertId};
        return this.apiDelete('alert', data, callback);
    }

    // purchase API Call
    purchase(email, items, callback, options) {
        let data = this._getOptions(options);
        data.email = email;
        data.items = items;
        return this.apiPost('purchase', data, callback);
    }

    // stats API Call
    stats(data, callback) {
        return this.apiGet('stats', data, callback);
    }

    statsList(callback, options = null) {
        let data = this._getOptions(options);
        data.stat = 'blast';  // @TODO likely bug?
        return this.stats(data, callback);
    }

    statsBlast(callback, options = null) {
        let data = this._getOptions(options);
        data.stat = 'blast';
        return this.stats(data, callback);
    }

    // Job API Call
    getJobStatus(jobId, callback) {
        return this.apiGet('job', {'job_id': job_id}, callback);  // @TODO fix preserved bug
    }

    processJob(job, callback, options = null, report_email = false, postback_url = false, binary_data_params = Array) {
        let data = this._getOptions(options);
        data['job'] = job;
        if (report_email !== false) {
            data['report_email'] = report_email;
        }
        if (postback_url !== false) {
            data['postback_url'] = postback_url;
        }
        return this.apiPost('job', data, callback, binary_data_params);
    }

    // Postback API Methods
    receiveOptoutPost(params) {
        if (typeof params === 'undefined') {
            return false
        }
        for (let param in ['action', 'email', 'sig']) {
            if (typeof params[param] === 'undefined') {
                return false;
            }
        }
        if (params['action'] !== 'optout') {
            return false;
        }
        let sig = params['sig'];
        delete params['sig'];
        if (sig !== SailthruUtil.getSignatureHash(params, this.api_secret)) {
            return false;
        } else {
            return true;
        }
    }
}

// Public API for creating *SailthruClient*
export function createSailthruClient(...args) {
    return new SailthruClient(...args);
}

export function createClient(...args) {
    return new SailthruClient(...args);
}