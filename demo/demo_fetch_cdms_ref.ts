import CrossRef from 'crossref';
console.time('crossref');
CrossRef.works(
	{
		query:
			'J.-T. Spaniol, K. L. K. Lee, O. Pirali, C. Puzzarini, and M.-A. Martin-Drumel, 2023, Phys. Chem. Chem. Phys., 25, 6397.'
	},
	(err, obj) => {
		console.timeEnd('crossref');
		console.log({ doi: obj[0].DOI, url: obj[0].URL });
	}
);
