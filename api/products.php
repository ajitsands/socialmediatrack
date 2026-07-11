<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/config.php';

requireAdmin();
$db     = getDB();
$action = param('action', 'list');
$input  = getInput();

// ─── List Products ────────────────────────────
if ($action === 'list') {
    $stmt = $db->query("
        SELECT p.id, p.client_id, p.name, p.category, p.description, p.price, p.cpc_rate, p.cpl_rate, p.currency, p.image_url, p.product_url, p.demo_url, p.status, p.created_at, p.updated_at,
               u.name as client_name,
               COUNT(DISTINCT c.id) as campaign_count,
               COUNT(DISTINCT CASE WHEN e.type='click' THEN e.id END) as total_clicks,
               COUNT(DISTINCT CASE WHEN e.type='conversion' THEN e.id END) as total_conversions
        FROM products p
        LEFT JOIN users u ON u.id = p.client_id
        LEFT JOIN campaigns c ON c.product_id = p.id
        LEFT JOIN events    e ON e.campaign_id = c.id
        GROUP BY p.id, p.client_id, p.name, p.category, p.description, p.price, p.cpc_rate, p.cpl_rate, p.currency, p.image_url, p.product_url, p.demo_url, p.status, p.created_at, p.updated_at, u.name
        ORDER BY p.created_at DESC
    ");
    apiSuccess($stmt->fetchAll());
}

// ─── Get Single Product ───────────────────────
if ($action === 'get') {
    $id   = (int)param('id');
    $stmt = $db->prepare("
        SELECT p.*, u.name as client_name 
        FROM products p 
        LEFT JOIN users u ON u.id = p.client_id 
        WHERE p.id=?
    ");
    $stmt->execute([$id]);
    $prod = $stmt->fetch();
    if (!$prod) apiError('Product not found', 404);
    apiSuccess($prod);
}

// ─── Create Product ───────────────────────────
if ($action === 'create') {
    $name     = sanitize($input['name']   ?? '');
    $cat      = sanitize($input['category']    ?? 'other');
    $desc     = sanitize($input['description'] ?? '');
    $price    = (float)($input['price']  ?? 0);
    $cpcRate  = (float)($input['cpc_rate'] ?? 0);
    $cplRate  = (float)($input['cpl_rate'] ?? 0);
    $clientId = !empty($input['client_id']) ? (int)$input['client_id'] : null;
    $curr     = sanitize($input['currency']    ?? 'BHD');
    $imgUrl   = trim($input['image_url']   ?? '');
    $pUrl     = trim($input['product_url'] ?? '');
    $dUrl     = trim($input['demo_url']    ?? '');
    $status   = in_array($input['status'] ?? 'active', ['active','inactive']) ? $input['status'] : 'active';
    $platform = sanitize($input['display_platform'] ?? 'instagram');

    if (!$name)  apiError('Product name is required.');
    if ($price < 0) apiError('Price cannot be negative.');
    if ($cpcRate < 0 || $cplRate < 0) apiError('Deduction rates cannot be negative.');

    $stmt = $db->prepare("INSERT INTO products (client_id,name,category,description,price,cpc_rate,cpl_rate,currency,image_url,product_url,demo_url,status,display_platform) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)");
    $stmt->execute([$clientId,$name,$cat,$desc,$price,$cpcRate,$cplRate,$curr,$imgUrl,$pUrl,$dUrl,$status,$platform]);
    $newId = $db->lastInsertId();

    $get = $db->prepare("SELECT p.*, u.name as client_name FROM products p LEFT JOIN users u ON u.id=p.client_id WHERE p.id=?");
    $get->execute([$newId]);
    apiSuccess($get->fetch(), 'Product created successfully');
}

// ─── Update Product ───────────────────────────
if ($action === 'update') {
    $id       = (int)($input['id'] ?? 0);
    $name     = sanitize($input['name']   ?? '');
    $cat      = sanitize($input['category']    ?? 'other');
    $desc     = sanitize($input['description'] ?? '');
    $price    = (float)($input['price']  ?? 0);
    $cpcRate  = (float)($input['cpc_rate'] ?? 0);
    $cplRate  = (float)($input['cpl_rate'] ?? 0);
    $clientId = !empty($input['client_id']) ? (int)$input['client_id'] : null;
    $curr     = sanitize($input['currency']    ?? 'BHD');
    $imgUrl   = trim($input['image_url']   ?? '');
    $pUrl     = trim($input['product_url'] ?? '');
    $dUrl     = trim($input['demo_url']    ?? '');
    $status   = in_array($input['status'] ?? 'active', ['active','inactive']) ? $input['status'] : 'active';
    $platform = sanitize($input['display_platform'] ?? 'instagram');

    if (!$id || !$name) apiError('ID and Name are required.');
    if ($price < 0) apiError('Price cannot be negative.');
    if ($cpcRate < 0 || $cplRate < 0) apiError('Deduction rates cannot be negative.');

    $stmt = $db->prepare("UPDATE products SET client_id=?,name=?,category=?,description=?,price=?,cpc_rate=?,cpl_rate=?,currency=?,image_url=?,product_url=?,demo_url=?,status=?,display_platform=? WHERE id=?");
    $stmt->execute([$clientId,$name,$cat,$desc,$price,$cpcRate,$cplRate,$curr,$imgUrl,$pUrl,$dUrl,$status,$platform,$id]);

    $get = $db->prepare("SELECT p.*, u.name as client_name FROM products p LEFT JOIN users u ON u.id=p.client_id WHERE p.id=?");
    $get->execute([$id]);
    apiSuccess($get->fetch(), 'Product updated successfully');
}

// ─── Delete Product ───────────────────────────
if ($action === 'delete') {
    $id = (int)($input['id'] ?? 0);
    if (!$id) apiError('ID required.');
    $stmt = $db->prepare("DELETE FROM products WHERE id=?");
    $stmt->execute([$id]);
    apiSuccess([], 'Product deleted');
}

// ─── Toggle Status ────────────────────────────
if ($action === 'toggle_status') {
    $id   = (int)($input['id'] ?? 0);
    if (!$id) apiError('ID required.');
    $stmt = $db->prepare("UPDATE products SET status=IF(status='active','inactive','active') WHERE id=?");
    $stmt->execute([$id]);
    $get = $db->prepare("SELECT id,name,status FROM products WHERE id=?");
    $get->execute([$id]);
    apiSuccess($get->fetch(), 'Status updated');
}

apiError('Invalid action');
