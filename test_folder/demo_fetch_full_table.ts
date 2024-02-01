import { html_to_csv, write_json_file, fetch_data_from_url } from '../src/utils';
import { parse_cdms_data, parse_jpl_data } from '../src/parse_full_table';

const fetch_cdms = async () => {
	try {
		const cdms_html = await fetch_data_from_url('CDMS');
		console.log('fetched data');

		const cdms_data = await parse_cdms_data(cdms_html);
		await write_json_file(cdms_data, 'cdms_data');
		html_to_csv(cdms_data, 'cdms_data');
	} catch (error) {
		console.warn(error);
	}
};

const fetch_jpl = async () => {
	try {
		const jpl_html = await fetch_data_from_url('JPL');
		console.log('fetched data');

		const jpl_data_obj = await parse_jpl_data(jpl_html);
		await write_json_file(jpl_data_obj, 'jpl_data');
		html_to_csv(jpl_data_obj, 'jpl_data');
	} catch (error) {
		console.warn(error);
	}
};
// await fetch_jpl();
