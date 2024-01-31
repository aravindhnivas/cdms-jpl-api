import axios from 'axios';
import * as cheerio from 'cheerio';
import * as Bun from 'bun';
import * as json2csv from 'json2csv';

const CDMS_URL = 'https://cdms.astro.uni-koeln.de';
const fetch_cdms_url = async () => {
	console.log(`fetching data from ${CDMS_URL}`);
	const res = await axios.get(CDMS_URL + '/classic/entries');
	if (res.status !== 200) throw new Error('Failed to fetch data');
	return res.data;
};

const JPL_URL = 'https://spec.jpl.nasa.gov';
const fetch_jpl_url = async () => {
	console.log(`fetching data from ${JPL_URL}`);
	const res = await axios.get(JPL_URL + '/ftp/pub/catalog/catdir.html');
	if (res.status !== 200) throw new Error('Failed to fetch data');
	return res.data;
};

const write_json_file = async (data: any, filename: string) => {
	console.log('writing json');
	await Bun.write(`./temp/${filename}.json`, JSON.stringify(data, null, 2));
	console.log(`wrote to ${filename}.json`);
};

const write_txt_file = async (data: any, filename: string) => {
	console.log('writing txt');
	await Bun.write(`./temp/${filename}.txt`, data);
	console.log(`wrote to ${filename}.txt`);
};

export async function get_jpl_data(jpl_html_string: string, filename: string = 'jpl_data') {
	if (!jpl_html_string) throw new Error('No data provided');
	const $ = cheerio.load(jpl_html_string);
	const jpl_data = $('pre').text();

	const jpl_data_arr = jpl_data.split('\n').map((line) => line.trim());
	const columns = ['ID', 'Name', '# lines', 'Version'];
	const data = jpl_data_arr.slice(1);
	const jpl_data_obj = data.map((row) => {
		const mod_row = row.split(/\s+/).slice(0, 4);
		let obj: Record<string, string> = {};
		columns.forEach((column, index) => {
			obj[column] = mod_row[index];
		});
		return obj;
	});
	await write_json_file(jpl_data_obj, 'jpl_data');

	console.log('finished fetching JPL data');
	return jpl_data_obj;
}

export async function get_cdms_data(
	cdms_html_string: string,
	filename: string = 'cdms_data',
	write_json: boolean = true
) {
	if (!cdms_html_string) throw new Error('No data provided');
	const $ = cheerio.load(cdms_html_string);

	let tableData = [];
	console.log('parsing table');

	const columns: string[] = [];
	$('th').each((index, column) => {
		const header_name = $(column).text().trim().replace('–', '-');
		if (header_name) columns.push(header_name);
	});

	$('table')
		.find('tr')
		.each((index, row) => {
			let cols: Record<string, string> = {};
			$(row)
				.find('td')
				.each((i, col) => {
					if (
						!(
							columns[i] === 'Catalog' ||
							columns[i] === 'Entry in cm-1' ||
							columns[i] === 'Documentation'
						)
					) {
						const val = $(col).text().trim().replace('–', '-');
						cols[columns[i]] = val;
					}
				});
			tableData.push(cols);
		});
	console.log('finished fetching data');
	if (write_json) {
		await write_json_file(tableData, filename);
	}
	return tableData;
}

export async function html_to_csv(data: string[] | Object, filename: string = 'output.csv') {
	console.log('converting to csv');
	const csv = json2csv.parse(data);
	console.log('writing csv');
	await Bun.write(`./temp/${filename}.csv`, csv);
	console.log(`wrote to ${filename}.csv`);
}

const fetch_cdms = async () => {
	try {
		const cdms_html = await fetch_cdms_url();
		console.log('fetched data');

		const cdms_data = await get_cdms_data(cdms_html);
		html_to_csv(cdms_data, 'cdms_data');
	} catch (error) {
		console.warn(error);
	}
};

const fetch_jpl = async () => {
	try {
		const jpl_html = await fetch_jpl_url();
		console.log('fetched data');

		const jpl_data_obj = await get_jpl_data(jpl_html);
		html_to_csv(jpl_data_obj, 'jpl_data');
	} catch (error) {
		console.warn(error);
	}
};

await fetch_jpl();
