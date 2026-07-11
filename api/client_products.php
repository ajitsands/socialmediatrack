<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/config.php';

requireAuth();
if ($_SESSION['role'] !== 'client') {
    apiError('Access denied.', 403);
}

$clientId = (int)$_SESSION['user_id'];
$db       = getDB();
$action   = param('action', 'list');

// Merge $_POST and JSON input to handle both multipart and raw JSON requests
$input = array_merge($_POST, getInput() ?: []);

// Helper to decode and save base64 image
function saveBase64Image($base64Str, $subDir = 'uploads/products/images/') {
    if (empty($base64Str)) return null;
    
    // Check if it's already a saved relative path
    if (strpos($base64Str, 'uploads/') === 0) {
        return $base64Str;
    }
    
    // Check base64 format: data:image/jpeg;base64,xxxx
    if (preg_match('/^data:image\/(\w+);base64,/', $base64Str, $type)) {
        $data = substr($base64Str, strpos($base64Str, ',') + 1);
        $ext = strtolower($type[1]);
        if (!in_array($ext, ['jpg', 'jpeg', 'png', 'webp'])) {
            apiError('Invalid image format. Allowed: jpg, jpeg, png, webp');
        }
        
        $data = base64_decode($data);
        if ($data === false) {
            apiError('Base64 decode failed');
        }
        
        // Size validation: 1 MB = 1048576 bytes
        if (strlen($data) > 1048576) {
            apiError('Each image must be less than 1 MB.');
        }
        
        $uploadDir = __DIR__ . '/../' . $subDir;
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }
        
        $filename = uniqid('prod_img_') . '.' . ($ext === 'jpeg' ? 'jpg' : $ext);
        $filepath = $uploadDir . $filename;
        if (file_put_contents($filepath, $data) === false) {
            apiError('Failed to save cropped image.');
        }
        
        return $subDir . $filename;
    }
    return null;
}

// Helper to save uploaded video file
function saveVideoFile($fileField, $subDir = 'uploads/products/videos/') {
    if (!isset($_FILES[$fileField]) || $_FILES[$fileField]['error'] === UPLOAD_ERR_NO_FILE) {
        return null;
    }
    
    $file = $_FILES[$fileField];
    if ($file['error'] !== UPLOAD_ERR_OK) {
        apiError('Upload error code: ' . $file['error']);
    }
    
    // Check size limit: 72 MB = 75497472 bytes
    if ($file['size'] > 75497472) {
        apiError('Video file size exceeds the 72 MB limit.');
    }
    
    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if (!in_array($ext, ['mp4', 'mov', 'avi', 'webm', 'mkv'])) {
        apiError('Invalid video format. Allowed: mp4, mov, avi, webm');
    }
    
    $uploadDir = __DIR__ . '/../' . $subDir;
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }
    
    $filename = uniqid('prod_vid_') . '.' . $ext;
    $filepath = $uploadDir . $filename;
    
    if (!move_uploaded_file($file['tmp_name'], $filepath)) {
        apiError('Failed to save uploaded video.');
    }
    
    return $subDir . $filename;
}

// ─── List Products ────────────────────────────
if ($action === 'list') {
    $stmt = $db->prepare("
        SELECT p.id, p.name, p.category, p.description, p.price, p.cpc_rate, p.cpl_rate, p.currency, p.image_url, p.image_url_1, p.image_url_2, p.image_url_3, p.video_url, p.display_platform, p.status, p.created_at,
               COUNT(DISTINCT c.id) as campaign_count,
               COUNT(DISTINCT e.id) as total_clicks,
               COUNT(DISTINCT CASE WHEN e.type='conversion' THEN e.id END) as total_conversions
        FROM products p
        LEFT JOIN campaigns c ON c.product_id = p.id
        LEFT JOIN events    e ON e.campaign_id = c.id
        WHERE p.client_id = ?
        GROUP BY p.id, p.name, p.category, p.description, p.price, p.cpc_rate, p.cpl_rate, p.currency, p.image_url, p.image_url_1, p.image_url_2, p.image_url_3, p.video_url, p.display_platform, p.status, p.created_at
        ORDER BY p.created_at DESC
    ");
    $stmt->execute([$clientId]);
    apiSuccess($stmt->fetchAll());
}

// ─── Get Single Product ───────────────────────
if ($action === 'get') {
    $id = (int)param('id');
    $stmt = $db->prepare("SELECT * FROM products WHERE id = ? AND client_id = ?");
    $stmt->execute([$id, $clientId]);
    $prod = $stmt->fetch();
    if (!$prod) apiError('Product not found', 404);
    apiSuccess($prod);
}

// ─── Create Product ───────────────────────────
if ($action === 'create') {
    $name = sanitize($input['name'] ?? '');
    $cat = sanitize($input['category'] ?? 'Other');
    $desc = sanitize($input['description'] ?? '');
    $price = (float)($input['price'] ?? 0);
    $cpcRate = (float)($input['cpc_rate'] ?? 0.020);
    $cplRate = (float)($input['cpl_rate'] ?? 0.200);
    $curr = sanitize($input['currency'] ?? 'BHD');
    $pUrl = trim($input['product_url'] ?? '');
    $dUrl = trim($input['demo_url'] ?? '');
    $platform = sanitize($input['display_platform'] ?? 'instagram');

    if (!$name) apiError('Product name is required.');
    if ($price < 0) apiError('Price cannot be negative.');
    if ($cpcRate < 0 || $cplRate < 0) apiError('Deduction rates cannot be negative.');
    if (!$pUrl) apiError('Product URL is required.');

    // Save images
    $img1 = saveBase64Image($input['image_1'] ?? null);
    $img2 = saveBase64Image($input['image_2'] ?? null);
    $img3 = saveBase64Image($input['image_3'] ?? null);

    // Save video
    $vid = saveVideoFile('video');

    // fallback image_url
    $mainImg = $img1 ?: 'assets/images/default_product.png';

    $stmt = $db->prepare("
        INSERT INTO products 
        (client_id, name, category, description, price, cpc_rate, cpl_rate, currency, image_url, image_url_1, image_url_2, image_url_3, video_url, display_platform, status) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    ");
    $stmt->execute([$clientId, $name, $cat, $desc, $price, $cpcRate, $cplRate, $curr, $mainImg, $img1, $img2, $img3, $vid, $platform]);
    $newId = $db->lastInsertId();

    apiSuccess(['id' => $newId], 'Product created successfully');
}

// ─── Update Product ───────────────────────────
if ($action === 'update') {
    $id = (int)($input['id'] ?? 0);
    
    // Verify ownership
    $chk = $db->prepare("SELECT * FROM products WHERE id = ? AND client_id = ?");
    $chk->execute([$id, $clientId]);
    $existingProd = $chk->fetch();
    if (!$existingProd) {
        apiError('Product not found or access denied.', 404);
    }

    $name = sanitize($input['name'] ?? '');
    $cat = sanitize($input['category'] ?? 'Other');
    $desc = sanitize($input['description'] ?? '');
    $price = (float)($input['price'] ?? 0);
    $cpcRate = (float)($input['cpc_rate'] ?? 0.020);
    $cplRate = (float)($input['cpl_rate'] ?? 0.200);
    $curr = sanitize($input['currency'] ?? 'BHD');
    $pUrl = trim($input['product_url'] ?? '');
    $dUrl = trim($input['demo_url'] ?? '');
    $platform = sanitize($input['display_platform'] ?? 'instagram');

    if (!$name) apiError('Product name is required.');
    if ($price < 0) apiError('Price cannot be negative.');
    if ($cpcRate < 0 || $cplRate < 0) apiError('Deduction rates cannot be negative.');
    if (!$pUrl) apiError('Product URL is required.');

    // Process images: if not passed, use existing value
    $img1 = isset($input['image_1']) ? saveBase64Image($input['image_1']) : $existingProd['image_url_1'];
    $img2 = isset($input['image_2']) ? saveBase64Image($input['image_2']) : $existingProd['image_url_2'];
    $img3 = isset($input['image_3']) ? saveBase64Image($input['image_3']) : $existingProd['image_url_3'];

    // Process video
    $vid = saveVideoFile('video');
    if ($vid === null) {
        if (isset($input['delete_video']) && $input['delete_video'] === '1') {
            $vid = null;
        } else {
            $vid = $existingProd['video_url'];
        }
    }

    // fallback image_url
    $mainImg = $img1 ?: 'assets/images/default_product.png';

    $stmt = $db->prepare("
        UPDATE products 
        SET name = ?, category = ?, description = ?, price = ?, cpc_rate = ?, cpl_rate = ?, currency = ?, image_url = ?, image_url_1 = ?, image_url_2 = ?, image_url_3 = ?, video_url = ?, display_platform = ? 
        WHERE id = ? AND client_id = ?
    ");
    $stmt->execute([$name, $cat, $desc, $price, $cpcRate, $cplRate, $curr, $mainImg, $img1, $img2, $img3, $vid, $platform, $id, $clientId]);

    apiSuccess(null, 'Product updated successfully');
}

// ─── Delete Product ───────────────────────────
if ($action === 'delete') {
    $id = (int)($input['id'] ?? 0);
    
    $chk = $db->prepare("SELECT id FROM products WHERE id = ? AND client_id = ?");
    $chk->execute([$id, $clientId]);
    if (!$chk->fetch()) {
        apiError('Product not found or access denied.', 404);
    }

    $stmt = $db->prepare("DELETE FROM products WHERE id = ? AND client_id = ?");
    $stmt->execute([$id, $clientId]);
    apiSuccess(null, 'Product deleted successfully');
}
