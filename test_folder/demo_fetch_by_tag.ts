import { write_json_file, write_txt_file, url_from_jpl_tag, url_from_cdms_tag } from '../src/utils';
import { CDMS, JPL } from '../src/parse_by_tagname';

const fetch_cdms = async (tag: string) => {
	try {
		const cdms_html = await url_from_cdms_tag(tag);
		console.log('fetched data');

		const cdms_data = await CDMS(cdms_html);
		await write_json_file(cdms_data, `cdms_data_${tag}`);
	} catch (error) {
		console.warn(error);
	}
};

const fetch_jpl = async (tag: string) => {
	try {
		const jpl_html = await url_from_jpl_tag(tag);
		console.log('fetched data');

		const { raw_data, ...jpl_data } = await JPL(jpl_html);
		await write_txt_file(raw_data, `jpl_data_${tag}`);
		await write_json_file(jpl_data, `jpl_data_${tag}`);
	} catch (error) {
		console.warn(error);
	}
};
// await fetch_jpl();
