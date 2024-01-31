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

// CDMS('039502');

export async function JPL(tag: string = '1001') {
	tag = tag.padStart(6, '0');

	const entries_url = `https://spec.jpl.nasa.gov/ftp/pub/catalog/doc/d${tag}.cat`;
	const { data } = await axios.get(entries_url);

	const datalines = data.split('\n');

	const data_obj = {};
	const qpart = {};
	const rot_const = {};

	for (let line of datalines) {
		line = line.replaceAll(/[\\\\\$\^\{\}:=]/g, '').trim();

		if (line.includes('headend')) break;
		if (!line) continue;
		console.log(line);
		if (line.match(/Q\(\d+\.\d+?\)/g)) {
			const [key, value] = line
				.split('&')
				.map((f) => f.trim())
				.slice(2, 4);
			qpart[key] = value;
		}

		if (line.match(/[ABC]&/g)) {
			console.log(line);
			const [key, value] = line
				.split('&')
				.map((f) => f.trim())
				.slice(2, 4);
			rot_const[key] = value;
		}
		let [key, value] = line
			.split('&')
			.map((f) => f.trim())
			.slice(0, 2);

		if (key.match(/[><]/g)) {
			// Split the key on the space character
			const parts = key.split(' ');
			// Reassemble the key and value
			key = parts.slice(0, -1).join(' ');
			value = parts[parts.length - 1] + ' ' + value;
		}

		if (key) data_obj[key] = value;
	}
	await Bun.write(
		`./temp/jpl_${tag}_data.json`,
		JSON.stringify({ ...data_obj, qpart, rot_const }, null, 2)
	);
	// const columns = ["Species Tag", "Version", "Date", "Contributor", "Lines Listed", "Freq. (GHz) <", "Max. J", "LOGSTR0", "LOGSTR1", "Isotope Corr.", "Egy. (cm$^{-1}$) $>$", "$\\mu_a$ =", "$\\mu_b$ =", "$\\mu_c$ ="];
}
// CDMS('004501');
JPL('4001');
