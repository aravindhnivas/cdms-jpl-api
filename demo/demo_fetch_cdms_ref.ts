import axios from 'axios';
import { html_to_csv, write_json_file, url_from_cdms_tag } from './utils';
import * as cheerio from 'cheerio';
// import CrossRef from 'crossref';
// console.time('crossref');
// CrossRef.works(
// 	{
// 		query:
// 			'J.-T. Spaniol, K. L. K. Lee, O. Pirali, C. Puzzarini, and M.-A. Martin-Drumel, 2023, Phys. Chem. Chem. Phys., 25, 6397.'
// 	},
// 	(err, obj) => {
// 		console.timeEnd('crossref');
// 		console.log({ doi: obj[0].DOI, url: obj[0].URL });
// 	}
// );

console.log('fetching CDMS data');
const cdms_tag_url = await url_from_cdms_tag('016501');
console.log(cdms_tag_url);
const res = await axios.get(cdms_tag_url);
const cdms_html = res.data;
const $ = cheerio.load(cdms_html);
// const ref_texts = $('p[align="justify"]').text();
// console.log(ref_texts);

const ref_list = $('font[color="#064898"]').text();
console.log(ref_list);
console.log('finished fetching CDMS data');
