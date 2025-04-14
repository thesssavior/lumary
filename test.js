import https from 'https';
import { HttpsProxyAgent } from 'https-proxy-agent';

// 🔥 This tells Node to ignore the self-signed SSL error
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const proxyUrl = 'http://brd-customer-hl_414d8129-zone-residential_proxy1:yd55dtlsq03w@brd.superproxy.io:33335';
const agent = new HttpsProxyAgent(proxyUrl);

https.get('https://geo.brdtest.com/welcome.txt?product=resi&method=native', { agent }, (res) => {
  res.pipe(process.stdout);
});
