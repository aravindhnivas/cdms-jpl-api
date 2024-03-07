// import { parse_cdms_data, parse_jpl_data } from 'cdms-jpl-api';
import { parse_cdms_data, parse_jpl_data } from '../src/index';
import { html_to_csv, write_json_file, fetch_data_from_url } from './utils';

const fetch_cdms = async () => {
	try {
		const cdms_html = await fetch_data_from_url('CDMS');
		console.log('fetching CDMS data');

		const cdms_data = await parse_cdms_data(cdms_html);
		await write_json_file(cdms_data, './temp/cdms_data');
		html_to_csv(cdms_data, './temp/cdms_data');
	} catch (error) {
		console.warn(error);
	}
};

await fetch_cdms();

const fetch_jpl = async () => {
	try {
		const jpl_html = await fetch_data_from_url('JPL');
		console.log('fetching JPL data');

		const jpl_data_obj = await parse_jpl_data(jpl_html);
		await write_json_file(jpl_data_obj, './temp/jpl_data');
		html_to_csv(jpl_data_obj, './temp/jpl_data');
	} catch (error) {
		console.warn(error);
	}
};

await fetch_jpl();
