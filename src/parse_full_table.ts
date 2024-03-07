/// <reference path="./types.d.ts" />

import * as cheerio from 'cheerio';

export async function parse_jpl_data(jpl_html_string: string) {
	if (!jpl_html_string) throw new Error('No data provided');

	const $ = cheerio.load(jpl_html_string);
	const jpl_data = $('pre').text();

	const jpl_data_arr = jpl_data.split('\n').map((line) => line.trim());
	const columns = ['ID', 'Name', '# lines', 'Version'] as const;

	const data = jpl_data_arr.slice(1);

	const jpl_data_obj = data
		.map((row) => {
			const mod_row = row.split(/\s+/).slice(0, 4);
			let obj: JPLData = {} as JPLData;
			columns.forEach((column, index) => {
				obj[column] = mod_row[index];
			});
			return obj;
		})
		.filter((obj) => !!obj.ID);
	console.log('finished fetching JPL data');
	return jpl_data_obj;
}

export async function parse_cdms_data(cdms_html_string: string) {
	if (!cdms_html_string) throw new Error('No data provided');
	const $ = cheerio.load(cdms_html_string);

	let tableData: CDMSData[] = [];
	console.log('parsing table');

	const columns: Array<keyof CDMSData> = [];
	$('th').each((index, column) => {
		const header_name = $(column).text().trim().replace('–', '-') as keyof CDMSData;
		if (header_name) columns.push(header_name);
	});

	$('table')
		.find('tr')
		.each((index, row) => {
			let cols: CDMSData = {} as CDMSData;
			$(row)
				.find('td')
				.each((i, col) => {
					const val = $(col).text().trim().replace('–', '-');
					cols[columns[i]] = val;
				});
			if (cols && cols.Tag) {
				tableData.push(cols);
			}
		});
	console.log('finished fetching data');
	return tableData;
}
