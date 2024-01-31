import * as Bun from 'bun';
import axios from 'axios';
import * as cheerio from 'cheerio';
// import tex2str from 'latex-to-unicode';

// console.log(tex2str('\\Sigma'));
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

	const [entries, ref] = data.split('headend');
	const reference = sanitize_latext_to_string(ref)
		.split('\n')
		.map((f) => f.trim())
		.filter((f) => f);

	const save_data = entries
		.replaceAll(/[\\\\\$\^\{\}:]/g, '')
		// .replaceAll(/(\\\\(?!\+)|[$:{}^])/g, '')
		.split('\n')
		.map((f) => f.trim());

	await Bun.write(`./temp/jpl_data.txt`, save_data.join('\n').trim());

	const name_meta: string[] = [];
	const props: {
		[key: string]: string | string[];
		Contributor: string[];
		reference: string[];
	} = { Contributor: [], reference: [] };
	let start_second_part = false;
	for (const ln of save_data) {
		const splitted_key_val = ln.split('&').map((f) => f.trim());
		if (splitted_key_val.join('').trim() === '') continue;
		if (ln.includes('Lines Listed ')) {
			start_second_part = true;
		}

		let [k1, v1, k2, v2] = splitted_key_val as string[];
		k1 = k1?.replaceAll(/[=]/g, '').trim() || '';
		k2 = k2?.replaceAll(/[=]/g, '').trim() || '';

		if (k1.match(/[><]/g)) {
			const parts = k1.split(' ');
			k1 = parts.slice(0, -1).join(' ');
			v1 = parts[parts.length - 1] + ' ' + v1;
		}

		if (start_second_part) {
			if (k1 && v1) props[k1] = v1;
			if (k2 && v2) props[k2] = v2;
		} else {
			if (k1 === 'Contributor' && v1) {
				props['Contributor'].push(v1);
				if (k2 && v2) {
					props[k2] = v2;
				}

				if (!k2 && v2) {
					name_meta.push(v2);
				}
				continue;
			}

			if (!k1 && v1) {
				props['Contributor'].push(v1);
			}

			if (k1 && v1) {
				props[k1] = v1;
			}
			if (k2 && v2) {
				props[k2] = v2;
			}

			if (!k2 && v2) {
				name_meta.push(v2);
			}
		}
	}
	await Bun.write(
		// `./temp/jpl_${tag}_data.json`,
		`./temp/jpl_data.json`,
		JSON.stringify({ ...props, name_meta, reference }, null, 2)
	);
	console.log('finished fetching JPL data');
}

// CDMS('004501');
JPL('32002');
