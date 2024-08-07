import axios from 'axios';
import * as cheerio from 'cheerio';
import * as json2csv from 'json2csv';
import { unlink } from 'node:fs/promises';

const fetch_data_from_url = async (url: string) => {
	console.log(`fetching data from ${url}`);
	const res = await axios.get(url, { responseType: 'json' });
	if (res.status !== 200) throw new Error('Failed to fetch data');
	const data = res.data;
	return data;
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const download_pubchem_data = async () => {
	const heading = 'Melting Point';
	const heading_type = 'Compound';
	const pubchem_annotation_url = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug_view/annotations';
	const format = 'JSON';

	// let page = 1;
	let total_pages = 19;
	for (let page = 1; page <= total_pages; page++) {
		try {
			const url = `${pubchem_annotation_url}/heading/${format}?heading=${heading}&heading_type=${heading_type}&page=${page}`;
			const data = await fetch_data_from_url(url);
			console.log('Data fetched');
			const annotations = data.Annotations.Annotation;
			console.log(annotations.length, annotations[0]);

			await Bun.write(
				`./melting_point_data/pubchem_data_page_${page}.json`,
				JSON.stringify(data, null, 2)
			);
			console.log('Data written to pubchem_data.json');
		} catch (error) {
			console.warn(error);
		} finally {
			console.log(`Progress: ${page}/${total_pages} pages fetched`);
			await delay(1000);
		}
	}
};

// await download_pubchem_data();
const save_csv = async () => {
	let total_data = 0;

	for (let page = 1; page <= 19; page++) {
		const filename = `./melting_point_data/pubchem_data_page_${page}.json`;

		const file = Bun.file(filename);
		const contents = await file.json();
		const processed = contents.Annotations.Annotation.map((item) => {
			if (!item) return null;
			return {
				name: item.Name,
				CID: item.LinkedRecords?.CID?.[0] || '',
				// MP: item?.Data?.map((d) => d?.Value?.StringWithMarkup[0].String || [''])[0] || ''
				MP:
					item?.Data?.map((d) => {
						if (d?.Value?.StringWithMarkup?.[0]?.String) {
							return d.Value.StringWithMarkup[0].String;
						}
						return '';
					})[0] || ''
			};
		});
		total_data += processed.length;
		// console.log(processed[0]);

		// save as csv
		const csv = json2csv.parse(processed);
		await Bun.write(`./melting_point_data/pubchem_data_page_${page}.csv`, csv);

		console.log(`Finished page ${page}`);
	}
	console.log(`Total data: ${total_data}`);
	console.log('Finished');
};

// await save_csv();
