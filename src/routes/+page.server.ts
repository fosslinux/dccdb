import fs from 'node:fs';

export function load() {
    return {
        code: (function() {
            try {
                return fs.readFileSync('/tmp/test.c', 'utf8');
            } catch(err) {
                console.error(err);
                return "";
            }
        })(),
    }
}
