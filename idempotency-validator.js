/**
 * Idempotency Validator - 幂等性校验器
 * 
 * 每个 injector 必须返回 { marker: string, apply: function(originalCode) }
 * 校验器检查 marker 是否存在，存在则跳过，不存在则应用
 */

const fs = require('fs');
const path = require('path');

function checkMarkerExists(content, marker) {
    return content.indexOf(marker) !== -1;
}

function applyPatch(original, marker, patchFn) {
    var result = patchFn(original);
    if (result === original) return null;
    return result;
}

function validateAndApply(filePath, patchDescriptor) {
    /**
     * patchDescriptor = {
     *   marker: string,        // 唯一标记，用于幂等性检查
     *   description: string,   // 变更描述
     *   patchFn: function(originalCode) => modifiedCode  // 应用函数
     * }
     */
    var fullPath = path.join(__dirname, filePath);
    if (!fs.existsSync(fullPath)) {
        return { success: false, error: 'file_not_found', applied: false };
    }
    
    var original = fs.readFileSync(fullPath, 'utf-8');
    
    // Step 1: 幂等性检查
    if (checkMarkerExists(original, patchDescriptor.marker)) {
        return { success: true, applied: false, reason: 'marker_exists', marker: patchDescriptor.marker };
    }
    
    // Step 2: 应用变更
    var modified = patchDescriptor.patchFn(original);
    if (!modified || modified === original) {
        return { success: true, applied: false, reason: 'no_effect' };
    }
    
    // Step 3: 写入临时文件验证
    var tmpDir = path.join(__dirname, '.tmp_check');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    var tmpPath = path.join(tmpDir, 'check_' + Date.now() + '.js');
    fs.writeFileSync(tmpPath, modified);
    
    // Step 4: 语法验证 (仅 .js 文件)
    if (filePath.endsWith('.js')) {
        var execSync = require('child_process').execSync;
        try {
            execSync('node --check "' + tmpPath + '"', { cwd: __dirname, timeout: 5000 });
        } catch(e) {
            try { fs.unlinkSync(tmpPath); } catch(ex) {}
            return { success: false, error: 'syntax_error: ' + e.message.substring(0, 200), applied: false };
        }
    }
    
    // Step 5: 替换原文件
    fs.renameSync(tmpPath, fullPath);
    
    return {
        success: true,
        applied: true,
        origLines: original.split('\n').length,
        modLines: modified.split('\n').length,
        marker: patchDescriptor.marker,
        description: patchDescriptor.description
    };
}

module.exports = { checkMarkerExists, validateAndApply };
