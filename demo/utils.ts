import axios from 'axios';
import * as Bun from 'bun';
import * as json2csv from 'json2csv';

export const write_json_file = async (data: any, filename: string) => {
	console.log('writing json');
	await Bun.write(`${filename}.json`, JSON.stringify(data, null, 2));
	console.log(`wrote to ${filename}.json`);
};

export const write_txt_file = async (data: any, filename: string) => {
	console.log('writing txt');
	await Bun.write(`${filename}.txt`, data);
	console.log(`wrote to ${filename}.txt`);
};

export const html_to_csv = async (
	data: (JPLData | CDMSData)[],
	filename: string = 'output.csv'
) => {
	console.log('converting to csv');
	const csv = json2csv.parse(data);
	console.log('writing csv');
	await Bun.write(`${filename}.csv`, csv);
	console.log(`wrote to ${filename}.csv`);
};

export const url_from_jpl_tag = (tag: string | number) => {
	const tag_num = String(tag).padStart(6, '0');
	return `https://spec.jpl.nasa.gov/ftp/pub/catalog/doc/d${tag_num}.cat`;
};

export const url_from_cdms_tag = (tag: string | number) => {
	const tag_num = String(tag).padStart(6, '0');
	return `https://cdms.astro.uni-koeln.de/cgi-bin/cdmsinfo?file=e${tag_num}.cat`;
};

export const URLs_by_tag = {
	CDMS: url_from_cdms_tag,
	JPL: url_from_jpl_tag
};

export const URLs = {
	CDMS: 'https://cdms.astro.uni-koeln.de/classic/entries',
	JPL: 'https://spec.jpl.nasa.gov/ftp/pub/catalog/catdir.html'
};

export const fetch_data_from_url = async (database: 'CDMS' | 'JPL' = 'CDMS') => {
	const url = URLs[database];
	console.log(`fetching data from ${url}`);
	const res = await axios.get(url);
	if (res.status !== 200) throw new Error('Failed to fetch data');
	return res.data;
};
