import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabase } from '@/lib/supabaseClient';

export async function DELETE(req: Request) {
  try {
    const session = await auth();

    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized. User not authenticated.' }, { status: 401 });
    }

    const userId = session.user.id;
    console.log('userId', userId);

    // Delete related data
    // Step 1: Get all folder IDs owned by the user
    const { data: foldersToDelete, error: foldersError } = await supabase
    .from('folders')
    .select('id')
    .eq('user_id', userId);

    if (foldersError) {
    return NextResponse.json({ error: 'Failed to fetch user folders', details: foldersError.message }, { status: 500 });
    }

    const folderIds = foldersToDelete?.map(f => f.id) ?? [];

    // Step 2: Delete summaries referencing those folders
    if (folderIds.length > 0) {
    const { error: deleteSummariesByFolderError } = await supabase
    .from('summaries')
    .delete()
    .in('folder_id', folderIds);

    if (deleteSummariesByFolderError) {
    return NextResponse.json({ error: 'Failed to delete summaries by folder_id', details: deleteSummariesByFolderError.message }, { status: 500 });
    }
    }

    // Step 3: Delete summaries by user_id
    const { error: deleteUserSummariesError } = await supabase
    .from('summaries')
    .delete()
    .eq('user_id', userId);

    if (deleteUserSummariesError) {
        return NextResponse.json({ error: 'Failed to delete user summaries', details: deleteUserSummariesError.message }, { status: 500 });
    }

    // Step 4: Delete user_reports by user_id
    const { error: deleteUserReportsError } = await supabase
    .from('user_reports')
    .delete()
    .eq('user_id', userId);

    if (deleteUserReportsError) {
        return NextResponse.json({ error: 'Failed to delete user reports', details: deleteUserReportsError.message }, { status: 500 });
    }

    // Step 5: Delete folders by user_id
    const { error: deleteFoldersError } = await supabase
    .from('folders')
    .delete()
    .eq('user_id', userId);

    if (deleteFoldersError) {
    return NextResponse.json({ error: 'Failed to delete folders', details: deleteFoldersError.message }, { status: 500 });
    }

    // ✅ Step 6: Delete user from `users` table
    const { data: deletedUsers, error: deleteUserRowError } = await supabase
    .from('users')
    .delete()
    .eq('id', userId)
    .select(); // Will return deleted rows
  
    if (deleteUserRowError) {
        console.error('❌ Failed to delete user:', deleteUserRowError);
        return NextResponse.json({ error: 'Failed to delete user record', details: deleteUserRowError.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, message: 'User account deleted successfully.' }, { status: 200 });

  } catch (error: any) {
    console.error('API Route /api/home/user/delete error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred during account deletion.', details: error.message }, { status: 500 });
  }
} 