'use server';

import { getAdminAuth, getAdminFirestore, createOrGetUser, checkUserExists } from '@/lib/firebase-admin';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import nodemailer from 'nodemailer';

const inviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['participant', 'mentor']),
  name: z.string().min(2, 'Name is required'),
  sendEmail: z.boolean().default(true),
});

type InviteData = z.infer<typeof inviteSchema>;

interface InviteResult {
  success: boolean;
  userId?: string;
  inviteCode?: string;
  error?: string;
}

/**
 * Send an invite to a participant or mentor
 * Creates Firebase Auth user and sends password reset email as magic link
 */
export async function sendYEPInvite(data: InviteData): Promise<InviteResult> {
  try {
    const validated = inviteSchema.parse(data);
    const auth = getAdminAuth();
    const firestore = getAdminFirestore();

    // Generate unique invite code
    const inviteCode = nanoid(10);

    // Check if user already exists
    const userExists = await checkUserExists(validated.email);
    
    let userId: string;

    if (userExists) {
      // Get existing user
      const userRecord = await auth.getUserByEmail(validated.email);
      userId = userRecord.uid;
    } else {
      // Create new Firebase Auth user
      const userRecord = await auth.createUser({
        email: validated.email,
        emailVerified: false,
        disabled: false,
      });
      userId = userRecord.uid;
    }

    // Create or update record in appropriate collection
    const collection = validated.role === 'participant' ? 'yep_participants' : 'yep_mentors';
    const docRef = firestore.collection(collection);

    // Check if record already exists by email
    const existingRecords = await docRef.where('email', '==', validated.email).limit(1).get();

    if (!existingRecords.empty) {
      // Update existing record with auth info
      const existingDoc = existingRecords.docs[0];
      await existingDoc.ref.update({
        userId,
        authEmail: validated.email,
        inviteCode,
        profileCompleted: false,
        updatedAt: new Date(),
      });
    } else {
      // Create new record
      const newRecord: any = {
        [validated.role === 'participant' ? 'youthParticipant' : 'name']: validated.name,
        email: validated.email,
        userId,
        authEmail: validated.email,
        inviteCode,
        profileCompleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Add required fields for participants
      if (validated.role === 'participant') {
        newRecord.sinLast4 = 'N/A';
        newRecord.sinHash = 'N/A';
      }

      // Add required fields for mentors
      if (validated.role === 'mentor') {
        newRecord.assignedStudents = [];
      }

      await docRef.add(newRecord);
    }

    // Generate password reset link and send custom email
    if (validated.sendEmail) {
      const actionCodeSettings = {
        url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002'}/profile?welcome=true`,
        handleCodeInApp: false,
      };

      // Generate the password reset link (this doesn't send email automatically)
      const resetLink = await auth.generatePasswordResetLink(validated.email, actionCodeSettings);
      
      // Send custom email with the reset link
      await sendInviteEmail({
        to: validated.email,
        name: validated.name,
        role: validated.role,
        resetLink,
        inviteCode,
      });
    }

    return {
      success: true,
      userId,
      inviteCode,
    };
  } catch (error) {
    console.error('Error sending invite:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send invite',
    };
  }
}

/**
 * Bulk invite multiple users
 */
export async function sendBulkYEPInvites(invites: InviteData[]): Promise<{
  success: boolean;
  results?: Array<{ email: string; success: boolean; error?: string }>;
  error?: string;
}> {
  try {
    const results = await Promise.all(
      invites.map(async (invite) => {
        const result = await sendYEPInvite(invite);
        return {
          email: invite.email,
          success: result.success,
          error: result.error,
        };
      })
    );

    return {
      success: true,
      results,
    };
  } catch (error) {
    console.error('Error sending bulk invites:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send bulk invites',
    };
  }
}

/**
 * Send invite email with password reset link
 */
async function sendInviteEmail(data: {
  to: string;
  name: string;
  role: 'participant' | 'mentor';
  resetLink: string;
  inviteCode: string;
}): Promise<void> {
  // Create transporter - IONOS SMTP
  const transporter = nodemailer.createTransport({
    host: 'smtp.ionos.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER || 'tech@sicklecellanemia.ca',
      pass: process.env.SMTP_PASSWORD || 'scago2024!',
    },
  });

  const roleText = data.role === 'participant' ? 'Participant' : 'Mentor';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to SCAGO Youth Empowerment Program</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #0070f3; color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: #f9f9f9; padding: 30px 20px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background-color: #0070f3; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
        .button:hover { background-color: #0051cc; }
        .invite-code { background-color: #fff; border: 2px dashed #0070f3; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 2px; margin: 20px 0; border-radius: 6px; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
        .link-box { background-color: #fff; padding: 15px; border: 1px solid #ddd; border-radius: 6px; word-break: break-all; margin: 15px 0; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🎓 Welcome to SCAGO YEP!</h1>
        <p>Youth Empowerment Program</p>
      </div>
      
      <div class="content">
        <p>Hello <strong>${data.name}</strong>,</p>
        
        <p>You've been invited to join the <strong>SCAGO Youth Empowerment Program</strong> as a <strong>${roleText}</strong>!</p>
        
        <p>To complete your registration and access your profile portal, please click the button below to set your password:</p>
        
        <div style="text-align: center;">
          <a href="${data.resetLink}" class="button">Complete Your Profile</a>
        </div>
        
        <p><strong>⚠️ This link will expire in 1 hour.</strong></p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
        
        <h3>📋 Your Invite Code:</h3>
        <div class="invite-code">${data.inviteCode}</div>
        <p style="text-align: center; font-size: 14px; color: #666;">Keep this code for your records</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
        
        <h3>🔗 Alternative Link (if button doesn't work):</h3>
        <div class="link-box">
          <a href="${data.resetLink}" style="color: #0070f3; word-break: break-all;">${data.resetLink}</a>
        </div>
        <p style="font-size: 14px; color: #666;">Copy and paste this link into your browser if the button above doesn't work.</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
        
        <h3>📝 What happens next?</h3>
        <ol style="margin-left: 20px;">
          <li>Click the link above to set your password</li>
          <li>Access your profile portal at <a href="${appUrl}/profile">${appUrl}/profile</a></li>
          <li>Complete your profile information</li>
          <li>Upload any required documents</li>
        </ol>
        
        <p><strong>Need help?</strong> Contact your program administrator if you have any questions.</p>
      </div>
      
      <div class="footer">
        <p>This email was sent by SCAGO Youth Empowerment Program</p>
        <p>If you didn't request this invitation, you can safely ignore this email.</p>
      </div>
    </body>
    </html>
  `;

  const textContent = `
Welcome to SCAGO Youth Empowerment Program!

Hello ${data.name},

You've been invited to join the SCAGO Youth Empowerment Program as a ${roleText}!

To complete your registration and access your profile portal, please use the link below to set your password:

${data.resetLink}

⚠️ This link will expire in 1 hour.

Your Invite Code: ${data.inviteCode}
(Keep this code for your records)

What happens next?
1. Click the link above to set your password
2. Access your profile portal at ${appUrl}/profile
3. Complete your profile information
4. Upload any required documents

Need help? Contact your program administrator if you have any questions.

---
This email was sent by SCAGO Youth Empowerment Program
If you didn't request this invitation, you can safely ignore this email.
  `;

  await transporter.sendMail({
    from: `"SCAGO Youth Empowerment Program" <${process.env.SMTP_USER || 'tech@sicklecellanemia.ca'}>`,
    to: data.to,
    subject: `Welcome to SCAGO Youth Empowerment Program - ${roleText} Invitation`,
    text: textContent,
    html: htmlContent,
  });
}

/**
 * Disable a user account
 */
export async function disableYEPUser(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = getAdminAuth();
    await auth.updateUser(userId, { disabled: true });

    return { success: true };
  } catch (error) {
    console.error('Error disabling user:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to disable user',
    };
  }
}

/**
 * Enable a user account
 */
export async function enableYEPUser(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = getAdminAuth();
    await auth.updateUser(userId, { disabled: false });

    return { success: true };
  } catch (error) {
    console.error('Error enabling user:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to enable user',
    };
  }
}

/**
 * Resend invite (password reset link)
 */
export async function resendYEPInvite(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = getAdminAuth();
    const firestore = getAdminFirestore();
    
    const actionCodeSettings = {
      url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002'}/profile`,
      handleCodeInApp: false,
    };

    // Generate the reset link
    const resetLink = await auth.generatePasswordResetLink(email, actionCodeSettings);

    // Find the user's record to get name and role
    let name = 'User';
    let role: 'participant' | 'mentor' = 'participant';
    let inviteCode = 'N/A';

    // Check participants
    const participantRecords = await firestore.collection('yep_participants').where('email', '==', email).limit(1).get();
    if (!participantRecords.empty) {
      const doc = participantRecords.docs[0].data();
      name = doc.youthParticipant || 'Participant';
      role = 'participant';
      inviteCode = doc.inviteCode || nanoid(10);
    } else {
      // Check mentors
      const mentorRecords = await firestore.collection('yep_mentors').where('email', '==', email).limit(1).get();
      if (!mentorRecords.empty) {
        const doc = mentorRecords.docs[0].data();
        name = doc.name || 'Mentor';
        role = 'mentor';
        inviteCode = doc.inviteCode || nanoid(10);
      }
    }

    // Send the email
    await sendInviteEmail({
      to: email,
      name,
      role,
      resetLink,
      inviteCode,
    });

    return { success: true };
  } catch (error) {
    console.error('Error resending invite:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to resend invite',
    };
  }
}

/**
 * Delete a user from Firebase Auth
 */
export async function deleteYEPUser(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = getAdminAuth();
    await auth.deleteUser(userId);

    return { success: true };
  } catch (error) {
    console.error('Error deleting user:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete user',
    };
  }
}

/**
 * Generate invite code for existing profile (for self-registration)
 */
export async function generateInviteCode(data: {
  recordId: string;
  collection: 'yep_participants' | 'yep_mentors';
}): Promise<{ success: boolean; inviteCode?: string; error?: string }> {
  try {
    const firestore = getAdminFirestore();
    const inviteCode = nanoid(10);

    // Update the record with the new invite code
    await firestore.collection(data.collection).doc(data.recordId).update({
      inviteCode,
      updatedAt: new Date(),
    });

    return { success: true, inviteCode };
  } catch (error) {
    console.error('Error generating invite code:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate invite code',
    };
  }
}

/**
 * Bulk generate invite codes for profiles without codes
 */
export async function bulkGenerateInviteCodes(): Promise<{
  success: boolean;
  count?: number;
  error?: string;
}> {
  try {
    const firestore = getAdminFirestore();
    let count = 0;

    // Generate for participants
    const participants = await firestore
      .collection('yep_participants')
      .where('inviteCode', '==', null)
      .get();

    for (const doc of participants.docs) {
      const inviteCode = nanoid(10);
      await doc.ref.update({
        inviteCode,
        updatedAt: new Date(),
      });
      count++;
    }

    // Generate for participants without the field at all
    const participantsNoField = await firestore
      .collection('yep_participants')
      .get();

    for (const doc of participantsNoField.docs) {
      const data = doc.data();
      if (!data.inviteCode) {
        const inviteCode = nanoid(10);
        await doc.ref.update({
          inviteCode,
          updatedAt: new Date(),
        });
        count++;
      }
    }

    // Generate for mentors
    const mentors = await firestore
      .collection('yep_mentors')
      .where('inviteCode', '==', null)
      .get();

    for (const doc of mentors.docs) {
      const inviteCode = nanoid(10);
      await doc.ref.update({
        inviteCode,
        updatedAt: new Date(),
      });
      count++;
    }

    // Generate for mentors without the field at all
    const mentorsNoField = await firestore
      .collection('yep_mentors')
      .get();

    for (const doc of mentorsNoField.docs) {
      const data = doc.data();
      if (!data.inviteCode) {
        const inviteCode = nanoid(10);
        await doc.ref.update({
          inviteCode,
          updatedAt: new Date(),
        });
        count++;
      }
    }

    return { success: true, count };
  } catch (error) {
    console.error('Error bulk generating invite codes:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate invite codes',
    };
  }
}

