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
        SELECT p.*,
               COUNT(DISTINCT c.id) as campaign_count,
               COUNT(DISTINCT e.id) as total_clicks,
               COUNT(DISTINCT CASE WHEN e.type='conversion' THEN e.id END) as total_conversions
        FROM products p
        LEFT JOIN campaigns c ON c.product_id = p.id
        LEFT JOIN events    e ON e.campaign_id = c.id
        GROUP BY p.id
        ORDER BY p.created_at DESC
    ");
    apiSuccess($stmt->fetchAll());
}

// ─── Get Single Product ───────────────────────
if ($action === 'get') {
    $id   = (int)param('id');
    $stmt = $db->prepare("SELECT * FROM products WHERE id=?");
    $stmt->execute([$id]);
    $prod = $stmt->fetch();
    if (!$prod) apiError('Product not found', 404);
    apiSuccess($prod);
}

// ─── Create Product ───────────────────────────
if ($action === 'create') {
    $name   = sanitize($input['name']   ?? '');
    $cat    = sanitize($input['category']    ?? 'other');
    $desc   = sanitize($input['description'] ?? '');
    $price  = (float)($input['price']  ?? 0);
    $curr   = sanitize($input['currency']    ?? 'BHD');
    $imgUrl = trim($input['image_url']   ?? '');
    $pUrl   = trim($input['product_url'] ?? '');
    $dUrl   = trim($input['demo_url']    ?? '');
    $status = in_array($input['status'] ?? 'active', ['active','inactive']) ? $input['status'] : 'active';

    if (!$name)  apiError('Product name is required.');
    if ($price < 0) apiError('Price cannot be negative.');

    $stmt = $db->prepare("INSERT INTO products (name,category,description,price,currency,image_url,product_url,demo_url,status) VALUES (?,?,?,?,?,?,?,?,?)");
    $stmt->execute([$name,$cat,$desc,$price,$curr,$imgUrl,$pUrl,$dUrl,$status]);
    $newId = $db->lastInsertId();

    $get = $db->prepare("SELECT * FROM products WHERE id=?");
    $get->execute([$newId]);
    apiSuccess($get->fetch(), 'Product created successfully');
}

// ─── Update Product ───────────────────────────
if ($action === 'update') {
    $id     = (int)($input['id'] ?? 0);
    $name   = sanitize($input['name']   ?? '');
    $cat    = sanitize($input['category']    ?? 'other');
    $desc   = sanitize($input['description'] ?? '');
    $price  = (float)($input['price']  ?? 0);
    $curr   = sanitize($input['currency']    ?? 'BHD');
    $imgUrl = trim($input['image_url']   ?? '');
    $pUrl   = trim($input['product_url'] ?? '');
    $dUrl   = trim($input['demo_url']    ?? '');
    $status = in_array($input['status'] ?? 'active', ['active','inactive']) ? $input['status'] : 'active';

    if (!$id || !$name) apiError('ID and Name are required.');

    $stmt = $db->prepare("UPDATE products SET name=?,category=?,description=?,price=?,currency=?,image_url=?,product_url=?,demo_url=?,status=? WHERE id=?");
    $stmt->execute([$name,$cat,$desc,$price,$curr,$imgUrl,$pUrl,$dUrl,$status,$id]);

    $get = $db->prepare("SELECT * FROM products WHERE id=?");
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
