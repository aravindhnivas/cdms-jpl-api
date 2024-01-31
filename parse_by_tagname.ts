import * as Bun from 'bun';
import axios from 'axios';
import * as cheerio from 'cheerio';

function endash_str(str: string) {
	return str.replaceAll('–', '-').trim();
}

export async function CDMS(tag: string = '005502') {
	tag = tag.padStart(6, '0');
	const entries_url = `https://cdms.astro.uni-koeln.de/cgi-bin/cdmsinfo?file=e${tag}.cat`;
	const { data } = await axios.get(entries_url);

	const $ = cheerio.load(data);
	const ref_element = $('p font[color="#064898"]');
	const references: string[] = [];

	// console.log("\n\nscraping references\n\n");
	const td_val = $("td[align='right']");
	const td_parent = td_val.parent();

	const full_info = {};
	for (const arr of td_parent.toArray()) {
		const key = $(arr?.firstChild).text().trim();
		// const value = $(arr.lastChild).text().trim();
		let value: string | string[] = '';

		if (key === 'Contributor') {
			if ($(arr.lastChild).html()?.includes('<br>')) {
				value = $(arr.lastChild).html()?.split('<br>');
			} else {
				value = [endash_str($(arr.lastChild).text().trim())];
			}
		} else {
			value = endash_str($(arr.lastChild).text().trim());
		}
		full_info[endash_str(key)] = value;
	}

	for (const element of ref_element.toArray()) {
		let ref = $(element).text();
		ref = ref.replaceAll(/(\(\d\))/g, '').trim();
		ref = ref.replaceAll('\n', ' ').replaceAll('  ', ' ');
		references.push(endash_str(ref));
	}

	const heading = $("caption font:not([color='red'])");
	// console.log(heading.html()?.split(/[, ]/g));
	const [name_formula, ...name_formula_meta] = heading.text()?.trim()?.split(/[, ]/g);
	const [name_html, ...name_html_meta] =
		heading
			.html()
			?.replace(/<\/?font.*?>/g, '')
			.split(/[, ]/g) ?? '';

	const iupac_name = $('caption').text().split('\n')[1].split(/[,;]/g)[0];
	const [, ...name_meta] =
		$('caption')
			.html()
			?.split('\n')[1]
			.split(/[,;]/g)
			.map((f) => endash_str(f.trim())) ?? [];

	const name = {
		default: endash_str(iupac_name),
		meta: name_meta.join(', '),
		formula: {
			default: endash_str(name_formula),
			meta: endash_str(name_formula_meta.join(' ').replaceAll('  ', ', '))
		},
		html: {
			default: endash_str(name_html),
			meta: endash_str(name_html_meta.join(' ').replaceAll('  ', ', '))
		}
	};
	const processed_informations = { name, ...full_info, references };
	await Bun.write(`./temp/cdms_${tag}_data.json`, JSON.stringify(processed_informations, null, 2));
	return processed_informations;
}

const sanitize_latext_to_string = (str: string) => {
	return str
		.replaceAll(/[$\^\{\}]/g, '')
		.replaceAll('~', ' ')
		.replaceAll('\\&', '&')
		.replaceAll('\\it', '')
		.replaceAll('\\bf', '')
		.replaceAll('  ', ' ')
		.replaceAll('\\', '')
		.trim();
};

export async function JPL(tag: string = '1001') {
	tag = tag.padStart(6, '0');
	const entries_url = `https://spec.jpl.nasa.gov/ftp/pub/catalog/doc/d${tag}.cat`;
	const { data } = await axios.get(entries_url);

	const datalines = data.split('\n');
	const reference = sanitize_latext_to_string(data.split('headend')[1])
		.split('\n')
		.map((f) => f.trim())
		.filter((f) => f);

	const data_obj = {};
	const qpart = {};
	let meta: string[] = [];

	for (let line of datalines) {
		line = line.replaceAll(/[\\\\\$\^\{\}:=]/g, '').trim();
		if (line.includes('headend')) break;
		if (!line) continue;

		let [key, value, qkey, qval] = line.split('&').map((f) => f.trim());
		if (key.match(/[><]/g)) {
			const parts = key.split(' ');
			key = parts.slice(0, -1).join(' ');
			value = parts[parts.length - 1] + ' ' + value;
		}
		if (qkey.match(/[><]/g)) {
			const parts = qkey.split(' ');
			qkey = parts.slice(0, -1).join(' ');
			qval = parts[parts.length - 1] + ' ' + qval;
		}

		key ? (data_obj[key] = value) : meta.push(value);
		qkey ? (qpart[qkey] = qval) : meta.push(qval);
	}
	meta = meta.filter((f) => f);
	await Bun.write(
		`./temp/jpl_${tag}_data.json`,
		// `./temp/jpl_data.json`,
		JSON.stringify({ ...data_obj, ...qpart, meta, reference }, null, 2)
	);
	// return { ...data_obj, ...rot_const, ...qpart, reference };
}

// CDMS('004501');
// JPL('2001');
