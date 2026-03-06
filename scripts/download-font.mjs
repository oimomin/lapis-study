import fs from 'fs';
import https from 'https';

const url = 'https://github.com/googlefonts/morisawa-biz-ud-mincho/raw/main/fonts/ttf/BIZUDMincho-Regular.ttf';
const dest = 'public/BIZUDMincho-Regular.ttf';

function download(url, dest) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode === 301 || res.statusCode === 302) {
                download(res.headers.location, dest).then(resolve).catch(reject);
            } else if (res.statusCode >= 200 && res.statusCode < 300) {
                const file = fs.createWriteStream(dest);
                res.pipe(file);
                file.on('finish', () => { file.close(); resolve(); });
            } else {
                reject(new Error(`Failed with status code: ${res.statusCode}`));
            }
        }).on('error', reject);
    });
}

download(url, dest)
    .then(() => console.log('Successfully downloaded BIZUDMincho-Regular.ttf to public/'))
    .catch((err) => console.error('Error downloading font:', err));
