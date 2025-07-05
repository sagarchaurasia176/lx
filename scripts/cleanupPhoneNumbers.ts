// scripts/cleanupPhoneNumbers.ts
import prisma from '../config/prisma';
import { PhoneFormatter } from '../utils/phoneFormatter';

export async function cleanupPhoneNumbers(): Promise<void> {
  console.log('Starting phone number cleanup...');
  
  try {
    // Get all users with contact numbers
    const users = await prisma.user.findMany({
      where: {
        contact: {
          not: null,
        },
      },
      select: {
        id: true,
        email: true,
        contact: true,
      },
    });
    
    console.log(`Found ${users.length} users with contact numbers`);
    
    let updatedCount = 0;
    let errorCount = 0;
    
    for (const user of users) {
      try {
        if (!user.contact) continue;
        
        // Normalize the phone number
        const normalizedPhone = PhoneFormatter.normalizePhoneNumber(user.contact);
        
        // Check if the number is valid
        if (!PhoneFormatter.validateForSMS(normalizedPhone)) {
          console.warn(`Invalid phone number for user ${user.email}: ${user.contact} -> ${normalizedPhone}`);
          errorCount++;
          continue;
        }
        
        // Only update if the number has changed
        if (user.contact !== normalizedPhone) {
          await prisma.user.update({
            where: { id: user.id },
            data: { contact: normalizedPhone },
          });
          
          console.log(`Updated ${user.email}: ${user.contact} -> ${normalizedPhone}`);
          updatedCount++;
        }
        
      } catch (error) {
        console.error(`Error processing user ${user.email}:`, error);
        errorCount++;
      }
    }
    
    console.log(`Cleanup completed!`);
    console.log(`- Updated: ${updatedCount} users`);
    console.log(`- Errors: ${errorCount} users`);
    console.log(`- Total processed: ${users.length} users`);
    
  } catch (error) {
    console.error('Error during cleanup:', error);
    throw error;
  }
}

/**
 * Dry run to preview what changes would be made
 */
export async function previewPhoneNumberChanges(): Promise<void> {
  console.log('Preview mode: Checking what would be changed...');
  
  try {
    const users = await prisma.user.findMany({
      where: {
        contact: {
          not: null,
        },
      },
      select: {
        id: true,
        email: true,
        contact: true,
      },
    });
    
    console.log(`Found ${users.length} users with contact numbers`);
    
    let wouldUpdateCount = 0;
    let errorCount = 0;
    
    for (const user of users) {
      try {
        if (!user.contact) continue;
        
        const normalizedPhone = PhoneFormatter.normalizePhoneNumber(user.contact);
        
        if (!PhoneFormatter.validateForSMS(normalizedPhone)) {
          console.warn(`INVALID: ${user.email}: ${user.contact} -> ${normalizedPhone}`);
          errorCount++;
          continue;
        }
        
        if (user.contact !== normalizedPhone) {
          console.log(`WOULD UPDATE: ${user.email}: ${user.contact} -> ${normalizedPhone}`);
          wouldUpdateCount++;
        }
        
      } catch (error) {
        console.error(`Error processing user ${user.email}:`, error);
        errorCount++;
      }
    }
    
    console.log(`Preview completed!`);
    console.log(`- Would update: ${wouldUpdateCount} users`);
    console.log(`- Errors: ${errorCount} users`);
    console.log(`- Total processed: ${users.length} users`);
    
  } catch (error) {
    console.error('Error during preview:', error);
    throw error;
  }
}

// CLI runner
if (require.main === module) {
  const args = process.argv.slice(2);
  const preview = args.includes('--preview') || args.includes('-p');
  
  if (preview) {
    previewPhoneNumberChanges()
      .then(() => process.exit(0))
      .catch((error) => {
        console.error('Preview failed:', error);
        process.exit(1);
      });
  } else {
    cleanupPhoneNumbers()
      .then(() => process.exit(0))
      .catch((error) => {
        console.error('Cleanup failed:', error);
        process.exit(1);
      });
  }
}