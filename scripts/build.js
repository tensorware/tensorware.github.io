const fs = require('fs');
const path = require('path');
const ps = require('child_process');

(async () => {

    const dirs = { build: `build`, template: `template` };
    if (!await fs.existsSync(`.index.json`)) {
        console.error('File .index.json is missing.');
        return;
    }

    // load files
    const db = await fs.readFileSync(`.index.json`, 'utf8');
    const template = await fs.readFileSync(path.join(dirs.template, `redirect.html`), 'utf8');
    const replace = (string, values) => string.replace(/{(.*?)}/g, (match, offset) => values[offset]);

    // cleanup
    await fs.rmSync(dirs.build, { recursive: true, force: true });
    await fs.mkdirSync(dirs.build);

    // generate index file
    const index = {};
    for (const [from, to] of Object.entries(JSON.parse(db))) {

        // obtain html from template
        const html = path.join(dirs.build, `${from}.html`);
        await fs.writeFileSync(html, replace(template, { url: to }), { encoding: 'utf8' });

        // encrypt html to json
        const args = {
            pwd: from,
            salt: `$(npx staticrypt -s)`,
            template: path.join(dirs.template, `redirect.json`),
            output: path.join(dirs.build, `${from}.json`)
        };
        await ps.execSync(`npx staticrypt ${html} ${args.pwd} -s ${args.salt} -f ${args.template} -o ${args.output}`);

        // append encrypted data to index
        const encrypted = await fs.readFileSync(args.output, 'utf8');
        Object.assign(index, JSON.parse(encrypted));
    }

    // export final encrypted data
    await fs.writeFileSync(`index.json`, JSON.stringify(index, null, 4), { encoding: 'utf8' });

})();