const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk('./src');
files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    if (content.includes('framer-motion')) {
        // Replace imports
        let newContent = content
            .replace(/import\s*\{\s*motion\s*\}\s*from\s*['"]framer-motion['"]/, "import { m } from 'framer-motion'")
            .replace(/import\s*\{\s*motion\s*,\s*AnimatePresence\s*\}\s*from\s*['"]framer-motion['"]/, "import { m, AnimatePresence } from 'framer-motion'")
            .replace(/import\s*\{\s*AnimatePresence\s*,\s*motion\s*\}\s*from\s*['"]framer-motion['"]/, "import { AnimatePresence, m } from 'framer-motion'");

        // Replace tags
        newContent = newContent.replace(/<motion\./g, '<m.').replace(/<\/motion\./g, '</m.');
        
        if (newContent !== content) {
            fs.writeFileSync(file, newContent, 'utf8');
            console.log('Updated', file);
        }
    }
});
