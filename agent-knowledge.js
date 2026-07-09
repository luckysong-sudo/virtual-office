/**
 * Agent Knowledge Base - 智能体知识库缓存
 * 
 * 存储已验证的优化方案，避免重复调用 callAgnes
 * 格式: { agentId: { version, lastUpdated, patches: [{ marker, description, applied }] } }
 */

const fs = require('fs');
const path = require('path');

const KNOWLEDGE_FILE = path.join(__dirname, 'knowledge.json');

function loadKnowledge() {
    try {
        if (fs.existsSync(KNOWLEDGE_FILE)) {
            return JSON.parse(fs.readFileSync(KNOWLEDGE_FILE, 'utf-8'));
        }
    } catch(e) {}
    return { version: 1, lastUpdated: null, agents: {} };
}

function saveKnowledge(kb) {
    kb.lastUpdated = new Date().toISOString();
    fs.writeFileSync(KNOWLEDGE_FILE, JSON.stringify(kb, null, 2));
}

function recordPatch(agentId, marker, description, applied) {
    var kb = loadKnowledge();
    if (!kb.agents[agentId]) kb.agents[agentId] = { patches: [], version: 1 };
    
    kb.agents[agentId].patches.push({
        marker: marker,
        description: description,
        applied: applied,
        timestamp: new Date().toISOString()
    });
    
    saveKnowledge(kb);
    return kb;
}

function getKnownPatches(agentId) {
    var kb = loadKnowledge();
    if (!kb.agents[agentId]) return [];
    return kb.agents[agentId].patches || [];
}

function isKnownPatch(agentId, marker) {
    var patches = getKnownPatches(agentId);
    return patches.some(function(p) { return p.marker === marker && p.applied; });
}

module.exports = { loadKnowledge, saveKnowledge, recordPatch, getKnownPatches, isKnownPatch };
