import axios from 'axios';
import * as cheerio from 'cheerio';
import * as json2csv from 'json2csv';

const fetch_data_from_url = async (url: string) => {
	// console.log(`fetching data from ${url}`);
	const res = await axios.get(url, { responseType: 'arraybuffer' });
	if (res.status !== 200) throw new Error('Failed to fetch data');
	const data = res.data.toString('utf-8');
	return data;
};
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const get_crc_data_by_page = async (page_no: number | string = 1) => {
	page_no = String(page_no).padStart(4, '0');
	const html_data = await fetch_data_from_url(
		`https://hbcp.chemnetbase.com/documents/03_02/03_02_${page_no}.xhtml?dswid=7629`
	);

	const $ = cheerio.load(html_data);
	const table_id = 'documentForm\\:j_idt144';
	const table = $(`#${table_id}`);

	const thead = table.find('thead');
	const tds = thead.find('td');
	// console.log(tds.length);

	const header_names = tds.map((i, el) => $(el).text()).get();
	console.log(header_names);

	const tbody = table.find('tbody');
	const rows = tbody.find('tr');
	// console.log(rows.length);

	const data = rows
		.map((i, el) => {
			const row = $(el);
			const tds = row.find('td');
			return [tds.map((i, el) => $(el).text()).get()];
		})
		.get();
	// console.log(
	// 	data[0],
	// 	data[0].length,
	// 	data.every((d) => d.length === data[0].length)
	// );
	// console.log('finished page', page_no);
	return { header_names, data };
};

const get_crc_data = async (range = [1, 2]) => {
	let progress = 0;
	let full_data: string[][] = [];

	const [start, end] = range;
	for (let i = start; i <= end; i++) {
		const { data } = await get_crc_data_by_page(i);

		full_data = full_data.concat(data);
		progress += 100 / end;

		await delay(1000);
		console.log(`Downloading ${progress.toFixed(2)}%`);

		// write to file every 10 pages
		if (i % 10 === 0) {
			const filename = `crc_data_${i}`;
			const csv = json2csv.parse(data);
			console.log(`writing ${filename}.csv`);
			await Bun.write(`${filename}.csv`, csv);
		}
	}
	console.log('finished');
	return full_data;
};

const data = await get_crc_data([1, 2]);

// const filename = 'crc_data_full';
// const csv = json2csv.parse(data);

// console.log('writing csv');
// await Bun.write(`${filename}.csv`, csv);
