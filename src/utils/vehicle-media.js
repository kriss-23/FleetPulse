const VEHICLE_MEDIA = [
  {
    match: 'Mercedes-Benz Sprinter',
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/2018%20Mercedes-Benz%20Sprinter%20314%20CDi%202.1%20Front.jpg',
    source: 'https://commons.wikimedia.org/wiki/File:2018_Mercedes-Benz_Sprinter_314_CDi_2.1_Front.jpg',
  },
  {
    match: 'MAN TGM',
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/MAN%20TGM%2018.290%204x4%20(side).jpg',
    source: 'https://commons.wikimedia.org/wiki/File:MAN_TGM_18.290_4x4_(side).jpg',
  },
  {
    match: 'Ford Transit Custom',
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Ford%20Transit%20Custom%20(2023)%201X7A1605.jpg',
    source: 'https://commons.wikimedia.org/wiki/File:Ford_Transit_Custom_(2023)_1X7A1605.jpg',
  },
  {
    match: 'Renault Kangoo',
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Renault%20Kangoo%20III%20E-Tech%20DSC%207209.jpg',
    source: 'https://commons.wikimedia.org/wiki/File:Renault_Kangoo_III_E-Tech_DSC_7209.jpg',
  },
  {
    match: 'Iveco Eurocargo',
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Iveco%20Eurocargo.JPG',
    source: 'https://commons.wikimedia.org/wiki/File:Iveco_Eurocargo.JPG',
  },
  {
    match: 'Volkswagen Crafter',
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/2017%20Volkswagen%20Crafter%20CR35%20Trendline%20TD%202.0%20Front.jpg',
    source: 'https://commons.wikimedia.org/wiki/File:2017_Volkswagen_Crafter_CR35_Trendline_TD_2.0_Front.jpg',
  },
];

export function getVehicleMedia(brandModel = '') {
  return VEHICLE_MEDIA.find(({ match }) => brandModel.includes(match)) || null;
}

export function vehicleImage(vehicle, className = 'vehicle-photo') {
  const media = getVehicleMedia(vehicle.brand_model);
  if (!media) return '';
  return `
    <figure class="${className} mb-3">
      <img src="${media.image}" alt="${vehicle.brand_model} vehicle photo" loading="lazy" referrerpolicy="no-referrer">
      <figcaption><a href="${media.source}" target="_blank" rel="noreferrer">Photo: Wikimedia Commons</a></figcaption>
    </figure>
  `;
}
