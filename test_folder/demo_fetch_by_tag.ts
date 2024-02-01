import { write_json_file, write_txt_file, URLs_by_tag, JPL, CDMS } from '../src/';
import axios from 'axios';

const fetch_by_tag = async (tag: string, database: 'CDMS' | 'JPL' = 'CDMS') => {
	try {
		const jpl_url = await URLs_by_tag[database](tag);

		const res = await axios.get(jpl_url);
		const jpl_html = res.data;
		console.log('fetched data');
		if (database === 'CDMS') {
			const cdms_data = await CDMS(jpl_html);

			await write_json_file(cdms_data, `./temp/cdms_data_${tag}`);
			return;
		} else if (database === 'JPL') {
			const { raw_data, ...jpl_data } = await JPL(jpl_html);

			await write_txt_file(raw_data, `./temp/jpl_data_${tag}`);
			await write_json_file(jpl_data, `./temp/jpl_data_${tag}`);
			return;
		}
	} catch (error) {
		console.warn(error);
	}
};

await fetch_by_tag('1001', 'JPL');
// await fetch_by_tag('1001', 'CDMS');
