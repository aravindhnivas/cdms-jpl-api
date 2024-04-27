import axios from 'axios';
import { url_from_cdms_tag } from './utils';
import * as cheerio from 'cheerio';
import CrossRef from 'crossref';
console.time('crossref');
CrossRef.works(
	{
		query: 'F. Matsushima, T. Oka, and K. Takagi, 1997, Phys. Rev. Lett., 78, 1664'
	},
	(err, obj) => {
		console.timeEnd('crossref');
		console.log({ doi: obj[0].DOI, url: obj[0].URL });

		console.log({
			1: obj[1].URL,
			2: obj[2].URL,
			3: obj[3].URL,
			4: obj[4].URL,
			5: obj[5].URL,
			6: obj[6].URL,
			7: obj[7].URL,
			8: obj[8].URL
		});
	}
);

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

// await fetch_all_cdms_ref(16501);
