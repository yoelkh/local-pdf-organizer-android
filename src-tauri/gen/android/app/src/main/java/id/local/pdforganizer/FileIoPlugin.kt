package id.local.pdforganizer

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.provider.OpenableColumns
import android.content.ContentValues
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import androidx.core.content.FileProvider
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import java.io.File
import java.io.FileInputStream

@InvokeArg class ShareArgs { lateinit var paths: List<String>; lateinit var mimeType: String }
@InvokeArg class OpenFileArgs { lateinit var path: String; lateinit var mimeType: String }
@InvokeArg class GetDisplayNameArgs { lateinit var uri: String }
@InvokeArg class SaveToDownloadsArgs { lateinit var paths: List<String>; lateinit var subDir: String }

@TauriPlugin
class FileIoPlugin(private val activity: Activity): Plugin(activity) {
    @Command
    fun share(invoke: Invoke) {
        try {
            val args = invoke.parseArgs(ShareArgs::class.java)
            val uris = args.paths.map { path ->
                FileProvider.getUriForFile(activity, "${activity.packageName}.fileprovider", File(path))
            }
            
            val intent = if (uris.size == 1) {
                Intent(Intent.ACTION_SEND).apply {
                    type = args.mimeType
                    putExtra(Intent.EXTRA_STREAM, uris[0])
                    clipData = android.content.ClipData.newRawUri("", uris[0])
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }
            } else {
                Intent(Intent.ACTION_SEND_MULTIPLE).apply {
                    type = args.mimeType
                    putParcelableArrayListExtra(Intent.EXTRA_STREAM, ArrayList(uris))
                    clipData = android.content.ClipData.newRawUri("", uris[0])
                    for (i in 1 until uris.size) {
                        clipData?.addItem(android.content.ClipData.Item(uris[i]))
                    }
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }
            }
            activity.startActivity(Intent.createChooser(intent, "Share"))
            invoke.resolve()
        } catch (e: Exception) { invoke.reject(e.message) }
    }

    @Command
    fun openFile(invoke: Invoke) {
        try {
            val args = invoke.parseArgs(OpenFileArgs::class.java)
            val uri = FileProvider.getUriForFile(activity, "${activity.packageName}.fileprovider", File(args.path))
            val intent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(uri, args.mimeType)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            
            try {
                activity.startActivity(Intent.createChooser(intent, "Open with"))
                invoke.resolve()
            } catch (e: android.content.ActivityNotFoundException) {
                invoke.reject("Unsupported: no app can open this file")
            }
        } catch (e: Exception) { invoke.reject(e.message) }
    }

    @Command
    fun getDisplayName(invoke: Invoke) {
        try {
            val uri = Uri.parse(invoke.parseArgs(GetDisplayNameArgs::class.java).uri)
            var name = ""
            activity.contentResolver.query(uri, null, null, null, null)?.use { cursor ->
                if (cursor.moveToFirst()) {
                    val idx = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                    if (idx != -1) name = cursor.getString(idx) ?: ""
                }
            }
            if (name.isEmpty()) name = uri.lastPathSegment ?: "unknown"
            
            val res = JSObject()
            res.put("name", name)
            invoke.resolve(res)
        } catch (e: Exception) { invoke.reject(e.message) }
    }
    
    @Command
    fun saveToDownloads(invoke: Invoke) {
        kotlin.concurrent.thread {
            try {
                if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
                    invoke.reject("Unsupported on API < 29")
                    return@thread
                }
                
                val args = invoke.parseArgs(SaveToDownloadsArgs::class.java)
                val resolver = activity.contentResolver
                var savedCount = 0
                
                for (path in args.paths) {
                    val file = File(path)
                    val ext = file.extension.lowercase()
                    val mimeType = when (ext) {
                        "pdf" -> "application/pdf"
                        "png" -> "image/png"
                        "jpg", "jpeg" -> "image/jpeg"
                        "zip" -> "application/zip"
                        else -> "application/octet-stream"
                    }
                    
                    val contentValues = ContentValues().apply {
                        put(MediaStore.MediaColumns.DISPLAY_NAME, file.name)
                        put(MediaStore.MediaColumns.MIME_TYPE, mimeType)
                        put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/" + args.subDir)
                        put(MediaStore.MediaColumns.IS_PENDING, 1)
                    }
                    
                    val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, contentValues)
                    if (uri != null) {
                        try {
                            resolver.openOutputStream(uri)?.use { out ->
                                FileInputStream(file).use { input ->
                                    input.copyTo(out)
                                }
                            }
                            contentValues.clear()
                            contentValues.put(MediaStore.MediaColumns.IS_PENDING, 0)
                            resolver.update(uri, contentValues, null, null)
                            savedCount++
                        } catch (e: Exception) {
                            resolver.delete(uri, null, null)
                            throw e
                        }
                    } else {
                        throw Exception("Failed to insert into MediaStore")
                    }
                }
                
                val res = JSObject()
                res.put("count", savedCount)
                invoke.resolve(res)
            } catch (e: Exception) { invoke.reject(e.message) }
        }
    }
}
