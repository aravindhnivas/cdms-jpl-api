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

async function fetch_all_cdms_ref(tag: string | number) {
	console.log('fetching CDMS data');
	const cdms_tag_url = await url_from_cdms_tag(tag);
	console.log(cdms_tag_url);
	const res = await axios.get(cdms_tag_url);
	const cdms_html = res.data;
	const $ = cheerio.load(cdms_html);

	const ref_texts = $('font[color="#064898"]').text();
	console.log(ref_texts);

	const entries = ref_texts
		.split(/\(\d+\)\s/g)
		.filter((f) => f.trim().length > 0)
		.map((f) => f.replaceAll('\n', ' ').trim());
	console.log(entries, entries.length);
	console.log('finished fetching CDMS data');
	return entries;
}

await fetch_all_cdms_ref(16501);
