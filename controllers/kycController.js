const { supabase } = require('../config/supabase');
const emailService = require('../services/emailService');
const logger = require('../utils/logger');

// Get all KYC submissions (admin only)
exports.getAllKYCSubmissions = async (req, res) => {
    try {
        const { status } = req.query;
        
        let query = supabase
            .from('kyc_verifications')
            .select('*')
            .order('submitted_at', { ascending: false });
        
        if (status) {
            query = query.eq('status', status);
        }
        
        const { data, error } = await query;
        
        if (error) {
            throw error;
        }
        
        res.json({
            success: true,
            submissions: data
        });
    } catch (error) {
        logger.error('Error fetching KYC submissions:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching KYC submissions'
        });
    }
};

// Get KYC submission by ID (admin only)
exports.getKYCSubmission = async (req, res) => {
    try {
        const { id } = req.params;
        
        const { data, error } = await supabase
            .from('kyc_verifications')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({
                    success: false,
                    message: 'KYC submission not found'
                });
            }
            throw error;
        }
        
        res.json({
            success: true,
            submission: data
        });
    } catch (error) {
        logger.error('Error fetching KYC submission:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching KYC submission'
        });
    }
};

// Approve KYC submission (admin only)
exports.approveKYC = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Get submission details
        const { data: submission, error: fetchError } = await supabase
            .from('kyc_verifications')
            .select('*')
            .eq('id', id)
            .single();
        
        if (fetchError || !submission) {
            return res.status(404).json({
                success: false,
                message: 'KYC submission not found'
            });
        }
        
        // Update KYC status
        const { error: updateError } = await supabase
            .from('kyc_verifications')
            .update({
                status: 'approved',
                reviewed_at: new Date().toISOString()
            })
            .eq('id', id);
        
        if (updateError) {
            throw updateError;
        }
        
        // Update user's KYC status
        const { error: userUpdateError } = await supabase
            .from('users')
            .update({
                kyc_verified: true,
                kyc_status: 'approved'
            })
            .eq('id', submission.user_id);
        
        if (userUpdateError) {
            logger.warn('Failed to update user KYC status:', userUpdateError);
        }
        
        // Send approval email
        try {
            await emailService.sendKYCApprovedEmail(submission.email);
            logger.info(`KYC approval email sent to ${submission.email}`);
        } catch (emailError) {
            logger.warn('Failed to send KYC approval email:', emailError);
        }
        
        res.json({
            success: true,
            message: 'KYC approved successfully'
        });
    } catch (error) {
        logger.error('Error approving KYC:', error);
        res.status(500).json({
            success: false,
            message: 'Error approving KYC'
        });
    }
};

// Reject KYC submission (admin only)
exports.rejectKYC = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        
        if (!reason) {
            return res.status(400).json({
                success: false,
                message: 'Rejection reason is required'
            });
        }
        
        // Get submission details
        const { data: submission, error: fetchError } = await supabase
            .from('kyc_verifications')
            .select('*')
            .eq('id', id)
            .single();
        
        if (fetchError || !submission) {
            return res.status(404).json({
                success: false,
                message: 'KYC submission not found'
            });
        }
        
        // Update KYC status
        const { error: updateError } = await supabase
            .from('kyc_verifications')
            .update({
                status: 'rejected',
                rejection_reason: reason,
                reviewed_at: new Date().toISOString()
            })
            .eq('id', id);
        
        if (updateError) {
            throw updateError;
        }
        
        // Update user's KYC status
        const { error: userUpdateError } = await supabase
            .from('users')
            .update({
                kyc_verified: false,
                kyc_status: 'rejected'
            })
            .eq('id', submission.user_id);
        
        if (userUpdateError) {
            logger.warn('Failed to update user KYC status:', userUpdateError);
        }
        
        // Send rejection email
        try {
            await emailService.sendKYCRejectedEmail(submission.email, reason);
            logger.info(`KYC rejection email sent to ${submission.email}`);
        } catch (emailError) {
            logger.warn('Failed to send KYC rejection email:', emailError);
        }
        
        res.json({
            success: true,
            message: 'KYC rejected successfully'
        });
    } catch (error) {
        logger.error('Error rejecting KYC:', error);
        res.status(500).json({
            success: false,
            message: 'Error rejecting KYC'
        });
    }
};

// Get user's KYC status
exports.getUserKYCStatus = async (req, res) => {
    try {
        const userId = req.user; // From auth middleware
        
        const { data, error } = await supabase
            .from('kyc_verifications')
            .select('*')
            .eq('user_id', userId)
            .order('submitted_at', { ascending: false })
            .limit(1)
            .single();
        
        if (error) {
            if (error.code === 'PGRST116') {
                // No KYC submission found
                return res.json({
                    success: true,
                    status: 'not_submitted'
                });
            }
            throw error;
        }
        
        res.json({
            success: true,
            status: data.status,
            details: {
                submittedAt: data.submitted_at,
                reviewedAt: data.reviewed_at,
                rejectionReason: data.rejection_reason
            }
        });
    } catch (error) {
        logger.error('Error fetching user KYC status:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching KYC status'
        });
    }
};