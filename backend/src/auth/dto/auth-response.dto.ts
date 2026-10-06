import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../users/entities/user.entity';

export class AuthUserDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() email: string;
  @ApiProperty({ enum: Role }) role: Role;
  @ApiProperty() active: boolean;
}

export class AuthResponseDto {
  @ApiProperty({ type: AuthUserDto }) user: AuthUserDto;
  @ApiProperty() accessToken: string;
}
