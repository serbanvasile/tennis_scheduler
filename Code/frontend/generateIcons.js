const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, 'assets', 'svg');
const destFile = path.join(__dirname, 'src', 'utils', 'sportIcons.ts');

const sports = ['basketball', 'pickleball', 'soccer', 'tennis', 'volleyball'];

let fileContent = `export const getSportSvgContent = (sportName: string): string => {
    const normalizedName = sportName.toLowerCase().trim();
    switch (normalizedName) {\n`;

sports.forEach(sport => {
    const filePath = path.join(assetsDir, `${sport}.svg`);
    if (fs.existsSync(filePath)) {
        let svgContent = fs.readFileSync(filePath, 'utf8');

        // Simple cleaning of SVG
        // Remove XML declaration
        svgContent = svgContent.replace(/<\?xml.*?\?>/g, '');
        // Remove comments
        svgContent = svgContent.replace(/<!--.*?-->/sg, '');
        // Remove Inkscape junk (namespaces)
        svgContent = svgContent.replace(/\s*xmlns:inkscape=".*?"/g, '');
        svgContent = svgContent.replace(/\s*xmlns:sodipodi=".*?"/g, '');
        // Remove sodipodi:docname, etc
        svgContent = svgContent.replace(/\s*\w+:\w+=".*?"/g, '');
        // Remove metadata/defs/sodipodi tags - rough regex, might be fragile but good enough for these files
        svgContent = svgContent.replace(/<metadata>.*?<\/metadata>/sg, '');
        svgContent = svgContent.replace(/<defs[\s\S]*?<\/defs>/sg, '');
        svgContent = svgContent.replace(/<sodipodi:namedview[\s\S]*?\/>/sg, '');

        // Trim whitespace
        svgContent = svgContent.trim();

        fileContent += `        case '${sport}':\n`;
        fileContent += `            return \`${svgContent}\`;\n`;
    }
});

fileContent += `        default:
            return '';
    }
};
`;

fs.writeFileSync(destFile, fileContent);
console.log(`Successfully generated ${destFile}`);
