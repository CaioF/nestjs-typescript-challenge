import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import request from 'supertest';
import { AuthModule } from '../../src/auth/auth.module';
import { UsersModule } from '../../src/users/users.module';
import { SalesModule } from '../../src/sales/sales.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Agent } from '../../src/sales/models/agent.entity';
import { Customer } from '../../src/sales/models/customer.entity';
import { Order } from '../../src/sales/models/order.entity';
import { User } from '../../src/users/models/user.entity';

jest.mock('nestjs-typeorm-paginate', () => ({
  paginate: jest.fn().mockResolvedValue({
    items: [
      {
        ordNum: '200133',
      },
    ],
    meta: {
      totalItems: 1,
      itemCount: 1,
      itemsPerPage: 10,
      totalPages: 1,
      currentPage: 1,
    },
    links: {
      first: 'link',
      previous: '',
      next: '',
      last: 'link',
    },
  }),
}));

describe('SalesController (e2e)', () => {
  let app: INestApplication;

  const access_token =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIyIiwiZW1haWwiOiJtYXJpYUBnbWFpbC5jb20iLCJpYXQiOjE2NTI2NTA0NDMsImV4cCI6MTY1MjczNjg0M30.RdvfO1l4O8fnseWyAXZxjfBpG3x30rB-8gu0I5ThUjo';

  const order = {
    ordNum: '200101',
    ordAmount: '3000',
    advanceAmount: '1000',
    ordDate: '2022-03-27',
    custCode: 'C00001',
    agentCode: 'A001',
    ordDescription: 'SOD',
  };

  const mockOrderRepository = {
    createQueryBuilder: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest
        .fn()
        .mockImplementationOnce(() =>
          Promise.resolve([
            {
              custCode: 'C00001',
              totalOrdAmount: '3000.00',
            },
          ]),
        )
        .mockImplementationOnce(() =>
          Promise.resolve([
            {
              agentCode: 'A001',
              totalOrdAmount: '800.00',
            },
          ]),
        )
        .mockImplementationOnce(() =>
          Promise.resolve([
            {
              custCountry: 'Australia',
              totalOrdAmount: '7700.00',
            },
          ]),
        ),
    }),
    paginate: jest.fn().mockResolvedValue({}),
    findOne: jest.fn().mockImplementation(() => Promise.resolve(order)),
    create: jest.fn().mockImplementation((dto) => Promise.resolve(dto)),
    save: jest.fn().mockImplementation((order) => Promise.resolve(order)),
    update: jest
      .fn()
      .mockImplementation((ordNum, updateOrderDto) =>
        Promise.resolve({ ordNum, ...updateOrderDto }),
      ),
    delete: jest.fn().mockImplementation(() =>
      Promise.resolve({
        raw: [],
        affected: 1,
      }),
    ),
  };

  const mockAgentRepository = {};
  const mockCustomerRepository = {};
  const mockUserRepository = {};

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        AuthModule,
        UsersModule,
        SalesModule,
      ],
    })
      .overrideProvider(getRepositoryToken(Agent))
      .useValue(mockAgentRepository)
      .overrideProvider(getRepositoryToken(Customer))
      .useValue(mockCustomerRepository)
      .overrideProvider(getRepositoryToken(Order))
      .useValue(mockOrderRepository)
      .overrideProvider(getRepositoryToken(User))
      .useValue(mockUserRepository)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        stopAtFirstError: true,
      }),
    );
    await app.init();
  });

  it('/api/orders (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/orders')
      .auth(access_token, { type: 'bearer' })
      .expect(200)
      .expect('Content-Type', /application\/json/)
      .expect({
        items: [
          {
            ordNum: '200133',
          },
        ],
        meta: {
          totalItems: 1,
          itemCount: 1,
          itemsPerPage: 10,
          totalPages: 1,
          currentPage: 1,
        },
        links: {
          first: 'link',
          previous: '',
          next: '',
          last: 'link',
        },
      });
  });

  it('/api/orders (POST)', () => {
    return request(app.getHttpServer())
      .post('/api/orders')
      .auth(access_token, { type: 'bearer' })
      .send(order)
      .expect(201)
      .expect('Content-Type', /application\/json/)
      .expect(order);
  });

  it('/api/orders (POST) should fail because missing parameters', () => {
    return request(app.getHttpServer())
      .post('/api/orders')
      .auth(access_token, { type: 'bearer' })
      .send({})
      .expect(400)
      .expect('Content-Type', /application\/json/);
  });

  it('/api/orders (UPDATE)', () => {
    return request(app.getHttpServer())
      .patch('/api/orders/200101')
      .auth(access_token, { type: 'bearer' })
      .send({ custCode: 'C00001' })
      .expect(200)
      .expect('Content-Type', /application\/json/)
      .expect({ ordNum: '200101', custCode: 'C00001' });
  });

  it('/api/orders (UPDATE) should fail because invalid parameter', () => {
    return request(app.getHttpServer())
      .patch('/api/orders/200101')
      .auth(access_token, { type: 'bearer' })
      .send({ ordAmount: 'A' })
      .expect(400)
      .expect('Content-Type', /application\/json/);
  });

  it('/api/orders (DELETE)', () => {
    return request(app.getHttpServer())
      .delete('/api/orders/200101')
      .auth(access_token, { type: 'bearer' })
      .expect(200)
      .expect('Content-Type', /application\/json/)
      .expect({
        raw: [],
        affected: 1,
      });
  });

  it('should get total amount by customer', () => {
    return request(app.getHttpServer())
      .get('/api/orders/total-amount-by-customer')
      .auth(access_token, { type: 'bearer' })
      .expect(200)
      .expect('Content-Type', /application\/json/)
      .expect([
        {
          custCode: 'C00001',
          totalOrdAmount: '3000.00',
        },
      ]);
  });

  it('should get total amount by agent', () => {
    return request(app.getHttpServer())
      .get('/api/orders/total-amount-by-agent')
      .auth(access_token, { type: 'bearer' })
      .expect(200)
      .expect('Content-Type', /application\/json/)
      .expect([
        {
          agentCode: 'A001',
          totalOrdAmount: '800.00',
        },
      ]);
  });

  it('should get total amount by country', () => {
    return request(app.getHttpServer())
      .get('/api/orders/total-amount-by-country')
      .auth(access_token, { type: 'bearer' })
      .expect(200)
      .expect('Content-Type', /application\/json/)
      .expect([
        {
          custCountry: 'Australia',
          totalOrdAmount: '7700.00',
        },
      ]);
  });
});
