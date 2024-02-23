// Bundle stylesheets

import './base.css';
import './index.css';

// On-scroll animation library

import AOS from 'aos';
import 'aos/dist/aos.css';

// Initialize scrolling animation effects
AOS.init({
	duration: 800,
	offset: -50
});


// Animate carosels, but they are only carosels on mobile screens

const CAROSEL_INTERVAL = 4000;
const caroselMediaQuery = window.matchMedia('(max-width: 768px)');

function handleCaroselMediqQuery (event) {
	document.querySelectorAll('.pictures-cascade').forEach( (carosel, index) => {
		if (event.matches) {
			if (carosel.carosel_index === undefined) {
				carosel.carosel_index = carosel.carosel_index;
				carosel.scrollLeft = 0;
			}

			carosel.caroselIntervalID = setInterval( () => {
				carosel.carosel_index++;

				if (carosel.carosel_index >= carosel.children.length) {
					carosel.carosel_index = 0;
				}

				carosel.scrollLeft = carosel.scrollWidth * carosel.carosel_index / carosel.children.length;
			}, CAROSEL_INTERVAL);
		}
		else {
			carosel.caroselIntervalID = null;
			carosel.carosel_index = 0;
			carosel.scrollLeft = 0;
			clearInterval(carosel.caroselIntervalID);
		}
	});
}

caroselMediaQuery.addListener(handleCaroselMediqQuery);
handleCaroselMediqQuery(caroselMediaQuery);
