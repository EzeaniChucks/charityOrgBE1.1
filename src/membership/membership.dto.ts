import { ApiProperty } from "@nestjs/swagger";

export class createMembershipDTO{
    @ApiProperty({example:'mongooseGeneratedId'})  
    creatorId: string;
    
    @ApiProperty({example:'days'})  
    chargeFrequencyUnit: string;
    
    @ApiProperty({example:5})
    chargeFrequencyValue: number;
    
    @ApiProperty({example:'MyMembership1'})  
    title: string;
    
    @ApiProperty({example:5})  
    amount: number;
    
    @ApiProperty({example:'GHS'})  
    currency: string;
    
    @ApiProperty({example:'This is what you stand to gain when you join my membership. I will send you exclusive emails about relevant events happening around the world'})  
    description: string;
    }
    
    export class fetchSingleMembershipDTO {
      @ApiProperty({ example: 'mongooseGeneratedId' })
      creatorId: string;
      @ApiProperty({ example: 'mongooseGeneratedId' })
      membershipId: string;
    }
    export class updateMembershipDTO {
      @ApiProperty({ example: 'mongooseGeneratedId' })
      creatorId: string;

      @ApiProperty({ example: 'mongooseGeneratedId' })
      membershipId: string;

      @ApiProperty({
        example: [
          {
            userId: 'mongooseGeneratedId',
            userName: 'John Doe',
            chargeDate: [new Date().toDateString()],
          },
        ],
      })
      members: [
        {
          userId: string;
          userName: string;
          chargeDate: Date[];
        },
      ];

      @ApiProperty({ example: 'months' })
      chargeFrequencyUnit: string;
      
      @ApiProperty({ example: 9 })
      chargeFrequencyValue: number;

      @ApiProperty({ example: 500 })
      amount: number;
      
      @ApiProperty({ example: 'NGN' })
      currency: string;
    }

    export class AcceptMembershipReviewsDTO {
      @ApiProperty({ example: 'mongooseGeneratedId' })
      reviewerId: string;

      @ApiProperty({ example: 'mongooseGeneratedId' })
      membershipId: string;
      
      @ApiProperty({ example: 'mongooseGeneratedId' })
      membershipOwnerId: string;
      
      @ApiProperty({ example: 'John Doe' })
      reviewName: string;

      @ApiProperty({ example: 'This membership has lived up to its expectations' })
      reviewComment: string;
    }

    export class DeleteMembershipDTO {
      @ApiProperty({ example: 'mongooseGeneratedId' })
      creatorId: string;

      @ApiProperty({ example: 'mongooseGeneratedId' })
      membershipId: string;
    }

    export class JoinMembershipDTO {
      @ApiProperty({ example: 'mongooseGeneratedId' })
      creatorId: string;

      @ApiProperty({ example: 'mongooseGeneratedId' })
      membershipId: string;
      
      @ApiProperty({ example: 'mongooseGeneratedId' })
      userId: string;
      
      @ApiProperty({ example: 'John Doe' })
      userName: string;
    }

    export class LeaveMembershipDTO {
      @ApiProperty({ example: 'mongooseGeneratedId' })
      creatorId: string;

      @ApiProperty({ example: 'mongooseGeneratedId' })
      membershipId: string;
      
      @ApiProperty({ example: 'mongooseGeneratedId' })
      userId: string;
    }