import * as cheerio from 'cheerio';

export async function parse_jpl_data(jpl_html_string: string) {
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
	console.log('finished fetching JPL data');
	return jpl_data_obj;
}

export async function parse_cdms_data(cdms_html_string: string) {
	if (!cdms_html_string) throw new Error('No data provided');
	const $ = cheerio.load(cdms_html_string);

	let tableData: string[] = [];
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
	return tableData;
}
